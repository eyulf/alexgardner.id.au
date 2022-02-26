---
layout: post
title: "Home-Lab Refresh: Kubernetes Cluster ArgoCD"
date: 2022-02-26 12:15 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-kubernetes-argocd
---

While testing the installation of Pi-hole, I found that [Flux][flux] does not properly handle reconciliation of resources if there have been changes made in Kubernetes manually. This is an [open issue with Flux][flux-issue], with no sign of resolution. Because of this issue, I've decided to switch from Flux to [ArgoCD][argocd].

To do this, first we will need to remove Flux from the git repository and then start adding what we need for ArgoCD.

1. [Flux removal](#flux-removal)
1. [ArgoCD - Git preparation](#argocd---git-preparation)
1. [ArgoCD - CLI Install](#argocd---cli-install)
1. [ArgoCD - K8s Install](#argocd---k8s-install)
1. [ArgoCD - App of Apps](#argocd---app-of-apps)
1. [ArgoCD - Bootstrapping](#argocd---bootstrapping)

## Flux removal

To remove Flux we just simply need to remove the configuration that was [added previously][homelab-refresh-k8s-gitops]. Since we are using git to store the configuration, this is quite easy as we just need to remove the configuration from git and [push the commit to GitHub][flux-removal-commit].

Restoring the Kubernetes cluster is also easy, we will simply rebuild the entire cluster. Since we are using Terraform and Ansible to provision and configure the servers, this is also easy. I've created a rebuild script to do much of this work, It's fairly straight forward and does the following.

- Dynamically grabs a list of the Kubernetes servers from the Ansible inventory.
- Taints the relevant resources in the Terraform state.
- Runs a Terraform apply to remove and then recreate the resources previously tainted.
- Removes any saved SSH host keys.
- Runs the `k8s-all.yml` Ansible Playbook against the newly created servers.

After running this script, we have a fresh Kubernetes cluster to work with.

```
root@k8s-controller-01:~# kubectl get nodes
NAME                STATUS   ROLES                  AGE     VERSION
k8s-controller-01   Ready    control-plane,master   4m12s   v1.23.4
k8s-controller-02   Ready    control-plane,master   2m39s   v1.23.4
k8s-controller-03   Ready    control-plane,master   2m57s   v1.23.4
k8s-worker-01       Ready    <none>                 106s    v1.23.4
k8s-worker-02       Ready    <none>                 106s    v1.23.4
k8s-worker-03       Ready    <none>                 106s    v1.23.4
```

## ArgoCD - Git preparation

Now we can move on to installing ArgoCD on to Kubernetes. The [getting started docs][argocd-doc-started] for ArgoCD has general steps on quickly setting up ArgoCD. I want this to be fully managed using git though.

Luckily we can manage ArgoCD itself using ArgoCD, to achieve this we'll use the [`App-of-Apps`][argocd-app-of-apps] method to deploy applications and will do so in a [declarative manner][argocd-declarative].

Currently the git repository looks like the following.

```
[user@workstation homelab]$ tree -dL 3
.
├── ansible
│   ├── group_vars
│   ├── host_vars
│   └── roles
│       ├── common
│       ├── db_server
│       ├── dns_server
│       ├── docker
│       ├── hardware
│       ├── kubernetes_common
│       ├── kubernetes_controller
│       ├── kubernetes_worker
│       ├── kvm_hypervisor
│       └── pacemaker
├── pki
└── terraform
    ├── infrastructure
    │   ├── core_services
    │   ├── hypervisors
    │   └── kubernetes
    └── modules
        └── kvm_virtual_machine

22 directories
```

After creating the ArgoCD directories, it now looks like the following.

```
[user@workstation homelab]$ tree -dL 3
.
├── ansible
│   ├── group_vars
│   ├── host_vars
│   └── roles
│       ├── common
│       ├── db_server
│       ├── dns_server
│       ├── docker
│       ├── hardware
│       ├── kubernetes_common
│       ├── kubernetes_controller
│       ├── kubernetes_worker
│       ├── kvm_hypervisor
│       └── pacemaker
├── kubernetes
│   ├── apps
│   ├── core
│   │   ├── apps
│   │   └── argocd-system
│   └── infrastructure
├── pki
└── terraform
    ├── infrastructure
    │   ├── core_services
    │   ├── hypervisors
    │   └── kubernetes
    └── modules
        └── kvm_virtual_machine

28 directories
```

With this new structure in place, we need to add the [files required by ArgoCD][argocd-commit].

```
[user@workstation homelab]$ tree kubernetes
kubernetes
├── apps
├── core
│   ├── apps
│   │   ├── Chart.yaml
│   │   ├── templates
│   │   │   └── argocd-system.yaml
│   │   └── values.yaml
│   └── argocd-system
│       ├── Chart.yaml
│       └── values.yaml
├── infrastructure
└── README.md

6 directories, 6 files
```

###  Newly created ArgoCD files

The new ArgoCD files we have created are:

[kubernetes/core/apps/Chart.yaml][kubernetes-core-apps-chart-yaml]

```
---
apiVersion: v2
name: applications
version: 1.0.0
type: application
```

[kubernetes/core/apps/templates/argocd-system.yaml][kubernetes-core-apps-templates-argocd-system-yaml]

```
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd
  namespace: argocd-system
  finalizers:
  - resources-finalizer.argocd.argoproj.io
spec:
  destination:
    namespace: argocd-system
    server: {{ .Values.spec.destination.server }}
  project: default
  source:
    path: kubernetes/core/argocd-system
    repoURL: {{ .Values.spec.source.repoURL }}
    targetRevision: {{ .Values.spec.source.targetRevision }}
  syncPolicy:
    automated: {}
    syncOptions:
      - CreateNamespace=true
```

[kubernetes/core/apps/values.yaml][kubernetes-core-apps-values-yaml]

```
---
spec:
  destination:
    server: https://kubernetes.default.svc
  source:
    repoURL: https://github.com/eyulf/homelab.git
    targetRevision: main
```

[kubernetes/core/argocd-system/Chart.yaml][kubernetes-core-argocd-system-chart-yaml]

```
---
name: argocd
apiVersion: v2
version: 1.0.0
dependencies:
  - name: argo-cd
    version: 3.28.1
    repository: https://argoproj.github.io/argo-helm
```

[kubernetes/core/argocd-system/values.yaml][kubernetes-core-argocd-system-values-yaml]

```
---
templates: {}
```

## ArgoCD - CLI Install

Now that we have the git repository ready for ArgoCD to use, we need to install ArgoCD on the Kubernetes controllers so that we can bootstrap it. This is done using [updated Ansible configuration][ansible-argocd-commit].

### Variables

The following additional variables have been used for this.

ansible/group_vars/k8s_controllers.yml
```
argocd_version: 'v2.2.5'
```

### Commands
```
cd ansible
ansible-playbook -i production k8s-controllers.yml - argocd
```

### Output
```
[user@workstation ansible]$ ansible-playbook -i production k8s-controllers.yml -t argocd

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-controller-02]
[WARNING]: flush_handlers task does not support when conditional

TASK [kubernetes_controller : kubernetes-controller | set variables] **************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)

TASK [kubernetes_controller : argocd | download argocd binary] ***************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=3    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-02          : ok=3    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-03          : ok=3    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

Next we need to install ArgoCD into Kubernetes itself.

## ArgoCD - K8s Install

Now that we have both the ArgoCD CLi installed and the git repository prepared, we now need to start using them. The first task is to install the ArgoCD Kubernetes pods, since we are using Helm we will use the ArgoCD Helm chart.

First we need to pull the git repository onto the Kubernetes controller.

```
root@k8s-controller-01:~# git clone https://github.com/eyulf/homelab.git homelab
Cloning into 'homelab'...
remote: Enumerating objects: 1025, done.
remote: Counting objects: 100% (1025/1025), done.
remote: Compressing objects: 100% (636/636), done.
remote: Total 1025 (delta 351), reused 910 (delta 237), pack-reused 0
Receiving objects: 100% (1025/1025), 516.00 KiB | 4.26 MiB/s, done.
Resolving deltas: 100% (351/351), done.
```

Now we can simply use the Helm chart we previously added to the git repository.

```
root@k8s-controller-01:~# cd homelab/kubernetes/core/argocd-system/
root@k8s-controller-01:~/homelab/kubernetes/core/argocd-system# helm dependencies update
WARNING: Kubernetes configuration file is group-readable. This is insecure. Location: /root/.kube/config
WARNING: Kubernetes configuration file is world-readable. This is insecure. Location: /root/.kube/config
Getting updates for unmanaged Helm repositories...
...Successfully got an update from the "https://argoproj.github.io/argo-helm" chart repository
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "projectcalico" chart repository
Update Complete. ⎈Happy Helming!⎈
Saving 1 charts
Downloading argo-cd from repo https://argoproj.github.io/argo-helm
Deleting outdated charts
```
```
root@k8s-controller-01:~/homelab/kubernetes/core/argocd-system# kubectl create namespace argocd-system
namespace/argocd-system created
```
```
root@k8s-controller-01:~/homelab/kubernetes/core/argocd-system# helm install -n argocd-system argocd . -f values.yaml
WARNING: Kubernetes configuration file is group-readable. This is insecure. Location: /root/.kube/config
WARNING: Kubernetes configuration file is world-readable. This is insecure. Location: /root/.kube/config
NAME: argocd
LAST DEPLOYED: Thu Feb 24 8:38:36 2022
NAMESPACE: argocd-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

Once the new pods are deployed ArgoCD is now installed on the cluster, looking closer at what it has done we can see the new pods.

```
adminuser@k8s-controller-01:~$ sudo kubectl get all -n argocd-system
NAME                                             READY   STATUS    RESTARTS   AGE
argocd-application-controller-6d79d8f8c9-vnvdw   1/1     Running   0          96s
argocd-dex-server-867457f597-ntw2j               1/1     Running   0          96s
argocd-redis-84675744fc-sbtv9                    1/1     Running   0          96s
argocd-repo-server-89ccd47b8-xdfrb               1/1     Running   0          96s
argocd-server-6d5b59bc4c-6mzhx                   1/1     Running   0          96s

NAME                                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)             AGE
service/argocd-application-controller   ClusterIP   10.104.168.34   <none>        8082/TCP            96s
service/argocd-dex-server               ClusterIP   10.109.69.211   <none>        5556/TCP,5557/TCP   96s
service/argocd-redis                    ClusterIP   10.104.201.26   <none>        6379/TCP            96s
service/argocd-repo-server              ClusterIP   10.108.185.85   <none>        8081/TCP            96s
service/argocd-server                   ClusterIP   10.105.79.87    <none>        80/TCP,443/TCP      96s

NAME                                            READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/argocd-application-controller   1/1     1            1           96s
deployment.apps/argocd-dex-server               1/1     1            1           96s
deployment.apps/argocd-redis                    1/1     1            1           96s
deployment.apps/argocd-repo-server              1/1     1            1           96s
deployment.apps/argocd-server                   1/1     1            1           96s

NAME                                                       DESIRED   CURRENT   READY   AGE
replicaset.apps/argocd-application-controller-6d79d8f8c9   1         1         1       96s
replicaset.apps/argocd-dex-server-867457f597               1         1         1       96s
replicaset.apps/argocd-redis-84675744fc                    1         1         1       96s
replicaset.apps/argocd-repo-server-89ccd47b8               1         1         1       96s
replicaset.apps/argocd-server-6d5b59bc4c                   1         1         1       96s
```

This has installed ArgoCD, but it is still not quite ready to use. As we can see in the following output, there are no Apps that ArgoCD is managing.

```
adminuser@k8s-controller-01:~$ sudo kubectl config set-context --current --namespace=argocd-system
Context "default" modified.
adminuser@k8s-controller-01:~$ sudo argocd app list --core
NAME  CLUSTER  NAMESPACE  PROJECT  STATUS  HEALTH  SYNCPOLICY  CONDITIONS  REPO  PATH  TARGET
```

We now need to install the first ArgoCD App, which in the `App of Apps` structure will link to other Apps.

## ArgoCD - App of Apps

To get started with actually using ArgoCD we need to deploy our first first `App of Apps` App. This was added to our repository when we prepared it, so this is very simple as we can just create the App referencing the git repository.

```
adminuser@k8s-controller-01:~$ sudo argocd app create core-apps \
>      --dest-namespace argocd-system \
>      --dest-server https://kubernetes.default.svc \
>      --repo https://github.com/eyulf/homelab.git \
>      --revision main \
>      --path kubernetes/core/apps \
>      --sync-policy auto \
>      --core
application 'core-apps' created
```

With this applied, ArgoCD now has an `App of Apps` App configured and has deployed the Apps this relates to.

```
adminuser@k8s-controller-01:~$ sudo argocd app list --core
NAME       CLUSTER                         NAMESPACE      PROJECT  STATUS  HEALTH   SYNCPOLICY  CONDITIONS  REPO                                  PATH                           TARGET
argocd     https://kubernetes.default.svc  argocd-system  default                   Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/argocd-system  main
core-apps  https://kubernetes.default.svc  argocd-system  default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/apps           main
```

With this done, we can now look at managing the Calico pods using ArgoCD. First we need to [add the Calico configuration][argocd-calico-commit] to the git repository.

The new ArgoCD files we have created are:

[kubernetes/core/apps/templates/calico-system.yaml][kubernetes-core-apps-templates-calico-system-yaml]

```
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: calico
  namespace: argocd-system
  finalizers:
  - resources-finalizer.argocd.argoproj.io
spec:
  destination:
    namespace: calico-system
    server: {{ .Values.spec.destination.server }}
  project: default
  source:
    path: kubernetes/core/calico-system
    repoURL: {{ .Values.spec.source.repoURL }}
    targetRevision: {{ .Values.spec.source.targetRevision }}
  syncPolicy:
    automated: {}
    syncOptions:
      - CreateNamespace=true
```

[kubernetes/core/calico-system/Chart.yaml][kubernetes-core-calico-system-chart-yaml]

```
---
name: calico
apiVersion: v2
version: 1.0.0
dependencies:
  - name: tigera-operator
    version: v3.21.4
    repository: https://docs.projectcalico.org/charts
```

[kubernetes/core/calico-system/values.yaml][kubernetes-core-calico-system-values-yaml]

```
---
```

Now we can manually sync the changes, if we don't do this ArgoCD will do it automatically anyway within 3 minutes time. Doing it manually allows us to capture the output shown below.

```
adminuser@k8s-controller-01:~$ sudo argocd app sync core-apps --core
TIMESTAMP                  GROUP              KIND    NAMESPACE                     NAME    STATUS   HEALTH        HOOK  MESSAGE
2022-02-24T20:44:51+11:00  argoproj.io  Application  argocd-system                argocd    Synced                       
2022-02-24T20:44:53+11:00  argoproj.io  Application  argocd-system                argocd    Synced                       application.argoproj.io/argocd unchanged
2022-02-24T20:44:53+11:00  argoproj.io  Application  argocd-system                calico   Running   Synced              application.argoproj.io/calico created
2022-02-24T20:44:53+11:00  argoproj.io  Application  argocd-system                calico  OutOfSync   Synced              application.argoproj.io/calico created

Name:               core-apps
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          argocd-system
URL:                https://argocd.example.com/applications/core-apps
Repo:               https://github.com/eyulf/homelab.git
Target:             main
Path:               kubernetes/core/apps
SyncWindow:         Sync Allowed
Sync Policy:        Automated
Sync Status:        Synced to main (82ae65d)
Health Status:      Healthy

Operation:          Sync
Sync Revision:      82ae65d9274102b1ee67c374fd82fee339d2a3e6
Phase:              Succeeded
Start:              2022-02-24 20:44:51 +1100 AEDT
Finished:           2022-02-24 20:44:53 +1100 AEDT
Duration:           2s
Message:            successfully synced (all tasks run)

GROUP        KIND         NAMESPACE      NAME    STATUS  HEALTH  HOOK  MESSAGE
argoproj.io  Application  argocd-system  argocd  Synced                application.argoproj.io/argocd unchanged
argoproj.io  Application  argocd-system  calico  Synced                application.argoproj.io/calico created
```

Now Calico shows up as an App in ArgoCD.

```
adminuser@k8s-controller-01:~$ sudo argocd app list --core
NAME       CLUSTER                         NAMESPACE      PROJECT  STATUS  HEALTH       SYNCPOLICY  CONDITIONS  REPO                                  PATH                           TARGET
argocd     https://kubernetes.default.svc  argocd-system  default  Synced  Progressing  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/argocd-system  main
calico     https://kubernetes.default.svc  calico-system  default  Synced  Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/calico-system  main
core-apps  https://kubernetes.default.svc  argocd-system  default  Synced  Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/apps           main
```

There is no change to the deployed Kubernetes infrastructure though, as we already had Calico installed.

```
adminuser@k8s-controller-01:~$ sudo kubectl get all -A
NAMESPACE         NAME                                                 READY   STATUS    RESTARTS      AGE
argocd-system     pod/argocd-application-controller-6d79d8f8c9-w2cw6   1/1     Running   0             8m5s
argocd-system     pod/argocd-dex-server-867457f597-lrplq               1/1     Running   0             8m5s
argocd-system     pod/argocd-redis-84675744fc-tdh2h                    1/1     Running   0             8m6s
argocd-system     pod/argocd-repo-server-89ccd47b8-qxgj6               1/1     Running   0             8m5s
argocd-system     pod/argocd-server-6d5b59bc4c-pgsjt                   1/1     Running   0             8m5s
calico-system     pod/calico-kube-controllers-7dddfdd6c9-bpjf6         1/1     Running   0             9m26s
calico-system     pod/calico-node-9zb7p                                1/1     Running   0             9m27s
calico-system     pod/calico-node-cxjqm                                1/1     Running   0             9m16s
calico-system     pod/calico-node-g6v6k                                1/1     Running   0             9m27s
calico-system     pod/calico-node-pgktq                                1/1     Running   0             9m16s
calico-system     pod/calico-node-qhvmg                                1/1     Running   0             9m27s
calico-system     pod/calico-node-xxscz                                1/1     Running   0             9m16s
calico-system     pod/calico-typha-79c78c5c75-6gswb                    1/1     Running   0             9m10s
calico-system     pod/calico-typha-79c78c5c75-7fs25                    1/1     Running   0             9m20s
calico-system     pod/calico-typha-79c78c5c75-prndc                    1/1     Running   0             9m27s
kube-system       pod/coredns-64897985d-2vsn8                          1/1     Running   0             13m
kube-system       pod/coredns-64897985d-m9lk6                          1/1     Running   0             13m
kube-system       pod/etcd-k8s-controller-01                           1/1     Running   0             13m
kube-system       pod/etcd-k8s-controller-02                           1/1     Running   0             12m
kube-system       pod/etcd-k8s-controller-03                           1/1     Running   0             11m
kube-system       pod/kube-apiserver-k8s-controller-01                 1/1     Running   0             10m
kube-system       pod/kube-apiserver-k8s-controller-02                 1/1     Running   0             10m
kube-system       pod/kube-apiserver-k8s-controller-03                 1/1     Running   0             10m
kube-system       pod/kube-controller-manager-k8s-controller-01        1/1     Running   1 (12m ago)   13m
kube-system       pod/kube-controller-manager-k8s-controller-02        1/1     Running   0             12m
kube-system       pod/kube-controller-manager-k8s-controller-03        1/1     Running   0             12m
kube-system       pod/kube-proxy-2cxmw                                 1/1     Running   0             9m16s
kube-system       pod/kube-proxy-5n6zx                                 1/1     Running   0             9m16s
kube-system       pod/kube-proxy-649cc                                 1/1     Running   0             13m
kube-system       pod/kube-proxy-67dgm                                 1/1     Running   0             9m16s
kube-system       pod/kube-proxy-cdfxp                                 1/1     Running   0             12m
kube-system       pod/kube-proxy-gxb92                                 1/1     Running   0             10m
kube-system       pod/kube-scheduler-k8s-controller-01                 1/1     Running   1 (12m ago)   13m
kube-system       pod/kube-scheduler-k8s-controller-02                 1/1     Running   0             12m
kube-system       pod/kube-scheduler-k8s-controller-03                 1/1     Running   0             12m
tigera-operator   pod/tigera-operator-768d489967-4ws76                 1/1     Running   0             9m48s

NAMESPACE       NAME                                      TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                  AGE
argocd-system   service/argocd-application-controller     ClusterIP   10.106.241.238   <none>        8082/TCP                 8m8s
argocd-system   service/argocd-dex-server                 ClusterIP   10.111.34.39     <none>        5556/TCP,5557/TCP        8m8s
argocd-system   service/argocd-redis                      ClusterIP   10.101.126.58    <none>        6379/TCP                 8m8s
argocd-system   service/argocd-repo-server                ClusterIP   10.103.62.188    <none>        8081/TCP                 8m9s
argocd-system   service/argocd-server                     ClusterIP   10.105.231.176   <none>        80/TCP,443/TCP           8m8s
calico-system   service/calico-kube-controllers-metrics   ClusterIP   10.104.146.41    <none>        9094/TCP                 7m58s
calico-system   service/calico-typha                      ClusterIP   10.102.242.198   <none>        5473/TCP                 9m27s
default         service/kubernetes                        ClusterIP   10.96.0.1        <none>        443/TCP                  13m
kube-system     service/kube-dns                          ClusterIP   10.96.0.10       <none>        53/UDP,53/TCP,9153/TCP   13m

NAMESPACE       NAME                                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR              AGE
calico-system   daemonset.apps/calico-node              6         6         6       6            6           kubernetes.io/os=linux     9m27s
calico-system   daemonset.apps/calico-windows-upgrade   0         0         0       0            0           kubernetes.io/os=windows   9m26s
kube-system     daemonset.apps/kube-proxy               6         6         6       6            6           kubernetes.io/os=linux     13m

NAMESPACE         NAME                                            READY   UP-TO-DATE   AVAILABLE   AGE
argocd-system     deployment.apps/argocd-application-controller   1/1     1            1           8m8s
argocd-system     deployment.apps/argocd-dex-server               1/1     1            1           8m8s
argocd-system     deployment.apps/argocd-redis                    1/1     1            1           8m8s
argocd-system     deployment.apps/argocd-repo-server              1/1     1            1           8m8s
argocd-system     deployment.apps/argocd-server                   1/1     1            1           8m8s
calico-system     deployment.apps/calico-kube-controllers         1/1     1            1           9m27s
calico-system     deployment.apps/calico-typha                    3/3     3            3           9m27s
kube-system       deployment.apps/coredns                         2/2     2            2           13m
tigera-operator   deployment.apps/tigera-operator                 1/1     1            1           9m48s

NAMESPACE         NAME                                                       DESIRED   CURRENT   READY   AGE
argocd-system     replicaset.apps/argocd-application-controller-6d79d8f8c9   1         1         1       8m8s
argocd-system     replicaset.apps/argocd-dex-server-867457f597               1         1         1       8m8s
argocd-system     replicaset.apps/argocd-redis-84675744fc                    1         1         1       8m8s
argocd-system     replicaset.apps/argocd-repo-server-89ccd47b8               1         1         1       8m8s
argocd-system     replicaset.apps/argocd-server-6d5b59bc4c                   1         1         1       8m8s
calico-system     replicaset.apps/calico-kube-controllers-7dddfdd6c9         1         1         1       9m27s
calico-system     replicaset.apps/calico-typha-79c78c5c75                    3         3         3       9m27s
kube-system       replicaset.apps/coredns-64897985d                          2         2         2       13m
tigera-operator   replicaset.apps/tigera-operator-768d489967                 1         1         1       9m48s
```

## ArgoCD - Bootstrapping

We want to be able to rebuild the Kubernetes cluster with minimal manual effort required. To achieve this we need to add the steps we followed above into Ansible and [commit the changes][ansible-bootstrap-commit] to git. To properly bootstrap this, I rebuilt the cluster again using the rebuild script I created.

### Variables

The following additional variables have been used for this.

ansible/group_vars/k8s_controllers.yml
```
git_repo_url: https://github.com/eyulf/homelab.git
git_branch: main
```

### Commands
```
./rebuild-k8s.sh
```

<div class="blog_post_output hidden">

<h3 id="output">Output</h3>
<p>(Click to show/hide the output)</p>
<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>[user@workstation homelab]$ ./rebuild-k8s.sh 
Tainting: k8s-controller-01
Resource instance module.k8s-controller-01.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-controller-01.libvirt_volume.main has been marked as tainted.
Tainting: k8s-controller-02
Resource instance module.k8s-controller-02.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-controller-02.libvirt_volume.main has been marked as tainted.
Tainting: k8s-controller-03
Resource instance module.k8s-controller-03.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-controller-03.libvirt_volume.main has been marked as tainted.
Tainting: k8s-worker-01
Resource instance module.k8s-worker-01.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-worker-01.libvirt_volume.main has been marked as tainted.
Tainting: k8s-worker-02
Resource instance module.k8s-worker-02.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-worker-02.libvirt_volume.main has been marked as tainted.
Tainting: k8s-worker-03
Resource instance module.k8s-worker-03.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-worker-03.libvirt_volume.main has been marked as tainted.
Waiting 30s
random_password.k8s-worker-02: Refreshing state... [id=none]
random_password.k8s-worker-01: Refreshing state... [id=none]
random_password.k8s-controller-01: Refreshing state... [id=none]
random_password.k8s-controller-03: Refreshing state... [id=none]
random_password.k8s-controller-02: Refreshing state... [id=none]
random_password.k8s-worker-03: Refreshing state... [id=none]
module.k8s-controller-02.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-02.example.domain.local-cloudinit.iso;572dd86d-61a6-4fce-95c4-44798223d7bd]
module.k8s-worker-02.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-02.example.domain.local.qcow2]
module.k8s-controller-02.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-02.example.domain.local.qcow2]
module.k8s-worker-02.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-02.example.domain.local-cloudinit.iso;47475e07-842b-4f92-87be-b5d4a02ae461]
module.k8s-controller-02.libvirt_domain.main: Refreshing state... [id=952bc61e-8d33-49ce-9653-75dbd188b103]
module.k8s-worker-02.libvirt_domain.main: Refreshing state... [id=1dc95e20-d55f-4c83-aaf4-3b5aced64196]
module.k8s-controller-01.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-01.example.domain.local.qcow2]
module.k8s-worker-01.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-01.example.domain.local-cloudinit.iso;8f970aa2-57c5-4c91-afc6-367ce34e58e6]
module.k8s-worker-01.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-01.example.domain.local.qcow2]
module.k8s-controller-01.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-01.example.domain.local-cloudinit.iso;bba61c65-519e-42a6-a6a3-bb88891b6753]
module.k8s-worker-03.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-03.example.domain.local.qcow2]
module.k8s-controller-03.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-03.example.domain.local-cloudinit.iso;284f8b5f-62ad-453f-aebc-c9fe6d3dbfc8]
module.k8s-controller-03.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-03.example.domain.local.qcow2]
module.k8s-worker-03.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-03.example.domain.local-cloudinit.iso;c54d422d-a53b-4813-9772-3907b7967ef0]
module.k8s-controller-01.libvirt_domain.main: Refreshing state... [id=6fdb3e4d-01d5-46a8-90ef-95b4963fd498]
module.k8s-worker-01.libvirt_domain.main: Refreshing state... [id=b4dc5c82-4136-4eaf-976f-39efe4a047c0]
module.k8s-worker-03.libvirt_domain.main: Refreshing state... [id=f49d69a8-ecf9-4283-a090-81eb458124c2]
module.k8s-controller-03.libvirt_domain.main: Refreshing state... [id=ae6a8d0d-0245-4613-9a96-ca1834dd33e9]

Note: Objects have changed outside of Terraform

Terraform detected the following changes made outside of Terraform since the last "terraform apply":

  # module.k8s-controller-01.libvirt_domain.main has changed
  ~ resource "libvirt_domain" "main" {
      + cmdline     = []
        id          = "6fdb3e4d-01d5-46a8-90ef-95b4963fd498"
        name        = "k8s-controller-01.example.domain.local"
        # (11 unchanged attributes hidden)



        # (4 unchanged blocks hidden)
    }

  # module.k8s-controller-02.libvirt_domain.main has changed
  ~ resource "libvirt_domain" "main" {
      + cmdline     = []
        id          = "952bc61e-8d33-49ce-9653-75dbd188b103"
        name        = "k8s-controller-02.example.domain.local"
        # (11 unchanged attributes hidden)



        # (4 unchanged blocks hidden)
    }

  # module.k8s-controller-03.libvirt_domain.main has changed
  ~ resource "libvirt_domain" "main" {
      + cmdline     = []
        id          = "ae6a8d0d-0245-4613-9a96-ca1834dd33e9"
        name        = "k8s-controller-03.example.domain.local"
        # (11 unchanged attributes hidden)



        # (4 unchanged blocks hidden)
    }

  # module.k8s-worker-01.libvirt_domain.main has changed
  ~ resource "libvirt_domain" "main" {
      + cmdline     = []
        id          = "b4dc5c82-4136-4eaf-976f-39efe4a047c0"
        name        = "k8s-worker-01.example.domain.local"
        # (11 unchanged attributes hidden)



        # (4 unchanged blocks hidden)
    }

  # module.k8s-worker-02.libvirt_domain.main has changed
  ~ resource "libvirt_domain" "main" {
      + cmdline     = []
        id          = "1dc95e20-d55f-4c83-aaf4-3b5aced64196"
        name        = "k8s-worker-02.example.domain.local"
        # (11 unchanged attributes hidden)



        # (4 unchanged blocks hidden)
    }

  # module.k8s-worker-03.libvirt_domain.main has changed
  ~ resource "libvirt_domain" "main" {
      + cmdline     = []
        id          = "f49d69a8-ecf9-4283-a090-81eb458124c2"
        name        = "k8s-worker-03.example.domain.local"
        # (11 unchanged attributes hidden)



        # (4 unchanged blocks hidden)
    }


Unless you have made equivalent changes to your configuration, or ignored the relevant attributes using
ignore_changes, the following plan may include actions to undo or respond to these changes.

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with
the following symbols:
-/+ destroy and then create replacement

Terraform will perform the following actions:

  # module.k8s-controller-01.libvirt_domain.main is tainted, so must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ volume_id    = "/var/lib/libvirt/images/k8s-controller-01.example.domain.local.qcow2" -> (known after apply)
              ~ wwn          = "" -> null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "6fdb3e4d-01d5-46a8-90ef-95b4963fd498" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-controller-01.example.domain.local"
        # (7 unchanged attributes hidden)

      ~ console {
            # (5 unchanged attributes hidden)
        }
      ~ console {
            # (5 unchanged attributes hidden)
        }

      ~ graphics {
          - websocket      = 0 -> null
            # (4 unchanged attributes hidden)
        }

      ~ network_interface {
          ~ addresses      = [] -> (known after apply)
          ~ mac            = "52:54:00:3E:69:76" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-controller-01.libvirt_volume.main is tainted, so must be replaced
-/+ resource "libvirt_volume" "main" {
      ~ format         = "qcow2" -> (known after apply)
      ~ id             = "/var/lib/libvirt/images/k8s-controller-01.example.domain.local.qcow2" -> (known after apply)
        name           = "k8s-controller-01.example.domain.local.qcow2"
        # (3 unchanged attributes hidden)
    }

  # module.k8s-controller-02.libvirt_domain.main is tainted, so must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ volume_id    = "/var/lib/libvirt/images/k8s-controller-02.example.domain.local.qcow2" -> (known after apply)
              ~ wwn          = "" -> null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "952bc61e-8d33-49ce-9653-75dbd188b103" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-controller-02.example.domain.local"
        # (7 unchanged attributes hidden)

      ~ console {
            # (5 unchanged attributes hidden)
        }
      ~ console {
            # (5 unchanged attributes hidden)
        }

      ~ graphics {
          - websocket      = 0 -> null
            # (4 unchanged attributes hidden)
        }

      ~ network_interface {
          ~ addresses      = [] -> (known after apply)
          ~ mac            = "52:54:00:9E:93:54" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-controller-02.libvirt_volume.main is tainted, so must be replaced
-/+ resource "libvirt_volume" "main" {
      ~ format         = "qcow2" -> (known after apply)
      ~ id             = "/var/lib/libvirt/images/k8s-controller-02.example.domain.local.qcow2" -> (known after apply)
        name           = "k8s-controller-02.example.domain.local.qcow2"
        # (3 unchanged attributes hidden)
    }

  # module.k8s-controller-03.libvirt_domain.main is tainted, so must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ volume_id    = "/var/lib/libvirt/images/k8s-controller-03.example.domain.local.qcow2" -> (known after apply)
              ~ wwn          = "" -> null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "ae6a8d0d-0245-4613-9a96-ca1834dd33e9" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-controller-03.example.domain.local"
        # (7 unchanged attributes hidden)

      ~ console {
            # (5 unchanged attributes hidden)
        }
      ~ console {
            # (5 unchanged attributes hidden)
        }

      ~ graphics {
          - websocket      = 0 -> null
            # (4 unchanged attributes hidden)
        }

      ~ network_interface {
          ~ addresses      = [] -> (known after apply)
          ~ mac            = "52:54:00:5E:45:AC" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-controller-03.libvirt_volume.main is tainted, so must be replaced
-/+ resource "libvirt_volume" "main" {
      ~ format         = "qcow2" -> (known after apply)
      ~ id             = "/var/lib/libvirt/images/k8s-controller-03.example.domain.local.qcow2" -> (known after apply)
        name           = "k8s-controller-03.example.domain.local.qcow2"
        # (3 unchanged attributes hidden)
    }

  # module.k8s-worker-01.libvirt_domain.main is tainted, so must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ volume_id    = "/var/lib/libvirt/images/k8s-worker-01.example.domain.local.qcow2" -> (known after apply)
              ~ wwn          = "" -> null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "b4dc5c82-4136-4eaf-976f-39efe4a047c0" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-worker-01.example.domain.local"
        # (7 unchanged attributes hidden)

      ~ console {
            # (5 unchanged attributes hidden)
        }
      ~ console {
            # (5 unchanged attributes hidden)
        }

      ~ graphics {
          - websocket      = 0 -> null
            # (4 unchanged attributes hidden)
        }

      ~ network_interface {
          ~ addresses      = [] -> (known after apply)
          ~ mac            = "52:54:00:4A:57:C9" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-worker-01.libvirt_volume.main is tainted, so must be replaced
-/+ resource "libvirt_volume" "main" {
      ~ format         = "qcow2" -> (known after apply)
      ~ id             = "/var/lib/libvirt/images/k8s-worker-01.example.domain.local.qcow2" -> (known after apply)
        name           = "k8s-worker-01.example.domain.local.qcow2"
        # (3 unchanged attributes hidden)
    }

  # module.k8s-worker-02.libvirt_domain.main is tainted, so must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ volume_id    = "/var/lib/libvirt/images/k8s-worker-02.example.domain.local.qcow2" -> (known after apply)
              ~ wwn          = "" -> null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "1dc95e20-d55f-4c83-aaf4-3b5aced64196" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-worker-02.example.domain.local"
        # (7 unchanged attributes hidden)

      ~ console {
            # (5 unchanged attributes hidden)
        }
      ~ console {
            # (5 unchanged attributes hidden)
        }

      ~ graphics {
          - websocket      = 0 -> null
            # (4 unchanged attributes hidden)
        }

      ~ network_interface {
          ~ addresses      = [] -> (known after apply)
          ~ mac            = "52:54:00:4A:11:2D" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-worker-02.libvirt_volume.main is tainted, so must be replaced
-/+ resource "libvirt_volume" "main" {
      ~ format         = "qcow2" -> (known after apply)
      ~ id             = "/var/lib/libvirt/images/k8s-worker-02.example.domain.local.qcow2" -> (known after apply)
        name           = "k8s-worker-02.example.domain.local.qcow2"
        # (3 unchanged attributes hidden)
    }

  # module.k8s-worker-03.libvirt_domain.main is tainted, so must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ volume_id    = "/var/lib/libvirt/images/k8s-worker-03.example.domain.local.qcow2" -> (known after apply)
              ~ wwn          = "" -> null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "f49d69a8-ecf9-4283-a090-81eb458124c2" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-worker-03.example.domain.local"
        # (7 unchanged attributes hidden)

      ~ console {
            # (5 unchanged attributes hidden)
        }
      ~ console {
            # (5 unchanged attributes hidden)
        }

      ~ graphics {
          - websocket      = 0 -> null
            # (4 unchanged attributes hidden)
        }

      ~ network_interface {
          ~ addresses      = [] -> (known after apply)
          ~ mac            = "52:54:00:6E:02:BC" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-worker-03.libvirt_volume.main is tainted, so must be replaced
-/+ resource "libvirt_volume" "main" {
      ~ format         = "qcow2" -> (known after apply)
      ~ id             = "/var/lib/libvirt/images/k8s-worker-03.example.domain.local.qcow2" -> (known after apply)
        name           = "k8s-worker-03.example.domain.local.qcow2"
        # (3 unchanged attributes hidden)
    }

Plan: 12 to add, 0 to change, 12 to destroy.
module.k8s-worker-03.libvirt_domain.main: Destroying... [id=f49d69a8-ecf9-4283-a090-81eb458124c2]
module.k8s-controller-03.libvirt_domain.main: Destroying... [id=ae6a8d0d-0245-4613-9a96-ca1834dd33e9]
module.k8s-controller-01.libvirt_domain.main: Destroying... [id=6fdb3e4d-01d5-46a8-90ef-95b4963fd498]
module.k8s-worker-01.libvirt_domain.main: Destroying... [id=b4dc5c82-4136-4eaf-976f-39efe4a047c0]
module.k8s-worker-02.libvirt_domain.main: Destroying... [id=1dc95e20-d55f-4c83-aaf4-3b5aced64196]
module.k8s-controller-02.libvirt_domain.main: Destroying... [id=952bc61e-8d33-49ce-9653-75dbd188b103]
module.k8s-controller-02.libvirt_domain.main: Destruction complete after 1s
module.k8s-controller-02.libvirt_volume.main: Destroying... [id=/var/lib/libvirt/images/k8s-controller-02.example.domain.local.qcow2]
module.k8s-worker-02.libvirt_domain.main: Destruction complete after 1s
module.k8s-worker-02.libvirt_volume.main: Destroying... [id=/var/lib/libvirt/images/k8s-worker-02.example.domain.local.qcow2]
module.k8s-controller-01.libvirt_domain.main: Destruction complete after 1s
module.k8s-worker-03.libvirt_domain.main: Destruction complete after 1s
module.k8s-controller-03.libvirt_domain.main: Destruction complete after 1s
module.k8s-controller-01.libvirt_volume.main: Destroying... [id=/var/lib/libvirt/images/k8s-controller-01.example.domain.local.qcow2]
module.k8s-worker-03.libvirt_volume.main: Destroying... [id=/var/lib/libvirt/images/k8s-worker-03.example.domain.local.qcow2]
module.k8s-controller-03.libvirt_volume.main: Destroying... [id=/var/lib/libvirt/images/k8s-controller-03.example.domain.local.qcow2]
module.k8s-worker-01.libvirt_domain.main: Destruction complete after 1s
module.k8s-worker-01.libvirt_volume.main: Destroying... [id=/var/lib/libvirt/images/k8s-worker-01.example.domain.local.qcow2]
module.k8s-controller-02.libvirt_volume.main: Destruction complete after 0s
module.k8s-controller-02.libvirt_volume.main: Creating...
module.k8s-controller-01.libvirt_volume.main: Destruction complete after 0s
module.k8s-worker-03.libvirt_volume.main: Destruction complete after 0s
module.k8s-worker-03.libvirt_volume.main: Creating...
module.k8s-controller-01.libvirt_volume.main: Creating...
module.k8s-worker-01.libvirt_volume.main: Destruction complete after 0s
module.k8s-worker-01.libvirt_volume.main: Creating...
module.k8s-controller-01.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-controller-01.example.domain.local.qcow2]
module.k8s-controller-01.libvirt_domain.main: Creating...
module.k8s-worker-01.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-01.example.domain.local.qcow2]
module.k8s-worker-01.libvirt_domain.main: Creating...
module.k8s-worker-02.libvirt_volume.main: Destruction complete after 1s
module.k8s-worker-02.libvirt_volume.main: Creating...
module.k8s-controller-02.libvirt_volume.main: Creation complete after 1s [id=/var/lib/libvirt/images/k8s-controller-02.example.domain.local.qcow2]
module.k8s-controller-02.libvirt_domain.main: Creating...
module.k8s-worker-02.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-02.example.domain.local.qcow2]
module.k8s-worker-02.libvirt_domain.main: Creating...
module.k8s-controller-03.libvirt_volume.main: Destruction complete after 1s
module.k8s-controller-03.libvirt_volume.main: Creating...
module.k8s-worker-03.libvirt_volume.main: Creation complete after 1s [id=/var/lib/libvirt/images/k8s-worker-03.example.domain.local.qcow2]
module.k8s-worker-03.libvirt_domain.main: Creating...
module.k8s-controller-03.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-controller-03.example.domain.local.qcow2]
module.k8s-controller-03.libvirt_domain.main: Creating...
module.k8s-controller-02.libvirt_domain.main: Creation complete after 1s [id=af0c9723-b9ae-4548-a795-47e7c77214e5]
module.k8s-worker-02.libvirt_domain.main: Creation complete after 1s [id=f4fe94e2-911e-4fa1-b0fa-c000d36a1896]
module.k8s-controller-01.libvirt_domain.main: Creation complete after 2s [id=55000b5a-2f5b-4829-ad8f-52c5ea772bb8]
module.k8s-worker-01.libvirt_domain.main: Creation complete after 2s [id=a79f813f-9b36-47ce-871b-95fe4d67bf65]
module.k8s-controller-03.libvirt_domain.main: Creation complete after 1s [id=494cc4d1-f272-461b-92e4-3cc61b590141]
module.k8s-worker-03.libvirt_domain.main: Creation complete after 1s [id=f2570954-8827-4b29-8b37-5fe3cab59ed8]

Apply complete! Resources: 12 added, 0 changed, 12 destroyed.
Waiting 60s
Resetting SSH Host Keys: k8s-controller-01
# Host 10.1.1.41 found: line 1061
# Host 10.1.1.41 found: line 1062
# Host 10.1.1.41 found: line 1063
/home/user/.ssh/known_hosts updated.
Original contents retained as /home/user/.ssh/known_hosts.old
# 10.1.1.41:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.41:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.41:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.41:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.41:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
Resetting SSH Host Keys: k8s-controller-02
# Host 10.1.1.42 found: line 1061
# Host 10.1.1.42 found: line 1062
# Host 10.1.1.42 found: line 1063
/home/user/.ssh/known_hosts updated.
Original contents retained as /home/user/.ssh/known_hosts.old
# 10.1.1.42:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.42:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.42:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.42:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.42:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
Resetting SSH Host Keys: k8s-controller-03
# Host 10.1.1.43 found: line 1061
# Host 10.1.1.43 found: line 1062
# Host 10.1.1.43 found: line 1063
/home/user/.ssh/known_hosts updated.
Original contents retained as /home/user/.ssh/known_hosts.old
# 10.1.1.43:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.43:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.43:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.43:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.43:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
Resetting SSH Host Keys: k8s-worker-01
# Host 10.1.1.51 found: line 1061
# Host 10.1.1.51 found: line 1062
# Host 10.1.1.51 found: line 1063
/home/user/.ssh/known_hosts updated.
Original contents retained as /home/user/.ssh/known_hosts.old
# 10.1.1.51:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.51:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.51:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.51:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.51:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
Resetting SSH Host Keys: k8s-worker-02
# Host 10.1.1.52 found: line 1061
# Host 10.1.1.52 found: line 1062
# Host 10.1.1.52 found: line 1063
/home/user/.ssh/known_hosts updated.
Original contents retained as /home/user/.ssh/known_hosts.old
# 10.1.1.52:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.52:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.52:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.52:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.52:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
Resetting SSH Host Keys: k8s-worker-03
# Host 10.1.1.53 found: line 1061
# Host 10.1.1.53 found: line 1062
# Host 10.1.1.53 found: line 1063
/home/user/.ssh/known_hosts updated.
Original contents retained as /home/user/.ssh/known_hosts.old
# 10.1.1.53:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.53:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.53:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.53:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
# 10.1.1.53:22 SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2

PLAY [k8s_all] ********************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-worker-01]
ok: [k8s-controller-01]
ok: [k8s-controller-02]
ok: [k8s-worker-02]
ok: [k8s-controller-03]
ok: [k8s-worker-03]

TASK [common | set variables] *****************************************************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/common/vars/Debian.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/common/vars/Debian.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/common/vars/Debian.yml)
ok: [k8s-worker-01] => (item=/homelab/ansible/roles/common/vars/Debian.yml)
ok: [k8s-worker-02] => (item=/homelab/ansible/roles/common/vars/Debian.yml)
ok: [k8s-worker-03] => (item=/homelab/ansible/roles/common/vars/Debian.yml)

TASK [common | populate service facts] ********************************************************************************
ok: [k8s-controller-03]
ok: [k8s-worker-02]
ok: [k8s-controller-01]
ok: [k8s-controller-02]
ok: [k8s-worker-01]
ok: [k8s-worker-03]

TASK [common : network | update hostname] *****************************************************************************
skipping: [k8s-controller-01]
skipping: [k8s-controller-02]
skipping: [k8s-controller-03]
skipping: [k8s-worker-01]
skipping: [k8s-worker-02]
skipping: [k8s-worker-03]

TASK [common : network | configure /etc/resolv.conf] ******************************************************************
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

TASK [common : network | configure /etc/hosts] ************************************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [common : firewall] **********************************************************************************************
included: /homelab/ansible/roles/common/tasks/firewall-Debian.yml for k8s-controller-01, k8s-controller-02, k8s-controller-03, k8s-worker-01, k8s-worker-02, k8s-worker-03

TASK [common : firewall | install ufw package] ************************************************************************
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-worker-02]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

TASK [common : firewall | allow ssh inbound from clients] *************************************************************
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [common : firewall | set outbound default] ***********************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-worker-02]
ok: [k8s-worker-01]
ok: [k8s-controller-03]
ok: [k8s-worker-03]

TASK [common : firewall | set inbound default] ************************************************************************
ok: [k8s-controller-01]
ok: [k8s-worker-01]
ok: [k8s-controller-03]
ok: [k8s-controller-02]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [common : firewall | enable firewall] ****************************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-controller-01]
changed: [k8s-worker-03]

TASK [common : ntp | update timezone] *********************************************************************************
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-worker-02]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

TASK [common : ntp | install ntp package] *****************************************************************************
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

TASK [common : ntp | configure /etc/ntp.conf] *************************************************************************
ok: [k8s-worker-01]
ok: [k8s-worker-02]
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]
ok: [k8s-worker-03]

TASK [common : ntp | start and enable ntp service] ********************************************************************
ok: [k8s-controller-03]
ok: [k8s-worker-01]
ok: [k8s-controller-01]
ok: [k8s-worker-02]
ok: [k8s-controller-02]
ok: [k8s-worker-03]

TASK [packages | install common packages] *****************************************************************************
changed: [k8s-controller-03] => (item=htop)
changed: [k8s-worker-02] => (item=htop)
changed: [k8s-controller-02] => (item=htop)
changed: [k8s-worker-01] => (item=htop)
changed: [k8s-controller-01] => (item=htop)
changed: [k8s-controller-03] => (item=lsof)
changed: [k8s-controller-02] => (item=lsof)
changed: [k8s-worker-02] => (item=lsof)
changed: [k8s-controller-01] => (item=lsof)
changed: [k8s-worker-01] => (item=lsof)
ok: [k8s-controller-03] => (item=net-tools)
ok: [k8s-controller-02] => (item=net-tools)
ok: [k8s-worker-02] => (item=net-tools)
ok: [k8s-controller-01] => (item=net-tools)
ok: [k8s-worker-01] => (item=net-tools)
ok: [k8s-controller-03] => (item=screen)
ok: [k8s-controller-02] => (item=screen)
ok: [k8s-worker-02] => (item=screen)
ok: [k8s-controller-01] => (item=screen)
ok: [k8s-worker-01] => (item=screen)
changed: [k8s-controller-03] => (item=strace)
changed: [k8s-controller-02] => (item=strace)
changed: [k8s-worker-01] => (item=strace)
changed: [k8s-worker-02] => (item=strace)
changed: [k8s-controller-01] => (item=strace)
changed: [k8s-controller-03] => (item=telnet)
changed: [k8s-controller-02] => (item=telnet)
changed: [k8s-worker-02] => (item=telnet)
changed: [k8s-worker-01] => (item=telnet)
changed: [k8s-controller-01] => (item=telnet)
ok: [k8s-controller-03] => (item=vim)
ok: [k8s-controller-02] => (item=vim)
ok: [k8s-worker-02] => (item=vim)
ok: [k8s-controller-01] => (item=vim)
ok: [k8s-worker-01] => (item=vim)
changed: [k8s-controller-03] => (item=gpg)
changed: [k8s-worker-01] => (item=gpg)
changed: [k8s-controller-01] => (item=gpg)
changed: [k8s-controller-02] => (item=gpg)
changed: [k8s-worker-02] => (item=gpg)
changed: [k8s-controller-03] => (item=rsync)
changed: [k8s-worker-01] => (item=rsync)
changed: [k8s-controller-01] => (item=rsync)
changed: [k8s-controller-03] => (item=arping)
changed: [k8s-controller-02] => (item=rsync)
changed: [k8s-worker-02] => (item=rsync)
changed: [k8s-worker-01] => (item=arping)
changed: [k8s-controller-01] => (item=arping)
changed: [k8s-controller-02] => (item=arping)
changed: [k8s-worker-02] => (item=arping)
changed: [k8s-controller-03] => (item=dnsutils)
changed: [k8s-worker-01] => (item=dnsutils)
changed: [k8s-controller-01] => (item=dnsutils)
changed: [k8s-controller-03] => (item=apt-transport-https)
changed: [k8s-controller-02] => (item=dnsutils)
ok: [k8s-controller-03] => (item=ca-certificates)
changed: [k8s-worker-01] => (item=apt-transport-https)
changed: [k8s-controller-01] => (item=apt-transport-https)
ok: [k8s-controller-03] => (item=curl)
ok: [k8s-worker-01] => (item=ca-certificates)
changed: [k8s-worker-02] => (item=dnsutils)
ok: [k8s-controller-01] => (item=ca-certificates)
ok: [k8s-controller-03] => (item=gnupg)
ok: [k8s-worker-01] => (item=curl)
changed: [k8s-controller-02] => (item=apt-transport-https)
ok: [k8s-controller-01] => (item=curl)
ok: [k8s-worker-01] => (item=gnupg)
ok: [k8s-controller-03] => (item=lsb-release)
ok: [k8s-controller-02] => (item=ca-certificates)
changed: [k8s-worker-02] => (item=apt-transport-https)
ok: [k8s-controller-01] => (item=gnupg)
ok: [k8s-worker-01] => (item=lsb-release)
ok: [k8s-controller-02] => (item=curl)
ok: [k8s-worker-02] => (item=ca-certificates)
ok: [k8s-controller-01] => (item=lsb-release)
ok: [k8s-controller-02] => (item=gnupg)
ok: [k8s-worker-02] => (item=curl)
changed: [k8s-controller-03] => (item=tree)
ok: [k8s-controller-02] => (item=lsb-release)
ok: [k8s-worker-02] => (item=gnupg)
changed: [k8s-worker-01] => (item=tree)
ok: [k8s-worker-02] => (item=lsb-release)
changed: [k8s-controller-01] => (item=tree)
changed: [k8s-controller-02] => (item=tree)
changed: [k8s-worker-03] => (item=htop)
changed: [k8s-worker-02] => (item=tree)
changed: [k8s-worker-03] => (item=lsof)
ok: [k8s-worker-03] => (item=net-tools)
ok: [k8s-worker-03] => (item=screen)
changed: [k8s-worker-03] => (item=strace)
changed: [k8s-worker-03] => (item=telnet)
ok: [k8s-worker-03] => (item=vim)
changed: [k8s-worker-03] => (item=gpg)
changed: [k8s-worker-03] => (item=rsync)
changed: [k8s-worker-03] => (item=arping)
changed: [k8s-worker-03] => (item=dnsutils)
changed: [k8s-worker-03] => (item=apt-transport-https)
ok: [k8s-worker-03] => (item=ca-certificates)
ok: [k8s-worker-03] => (item=curl)
ok: [k8s-worker-03] => (item=gnupg)
ok: [k8s-worker-03] => (item=lsb-release)
changed: [k8s-worker-03] => (item=tree)

TASK [common : packages | enable additional repos] ********************************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

TASK [common : auto-updates] ******************************************************************************************
included: /homelab/ansible/roles/common/tasks/auto-update-Debian.yml for k8s-controller-01, k8s-controller-02, k8s-controller-03, k8s-worker-01, k8s-worker-02, k8s-worker-03

TASK [common : auto-updates | install unattended-upgrades package] ****************************************************
ok: [k8s-worker-02]
ok: [k8s-controller-03]
ok: [k8s-worker-01]
ok: [k8s-controller-01]
ok: [k8s-controller-02]
ok: [k8s-worker-03]

TASK [common : auto-updates | configure /etc/apt/apt.conf.d/20auto-upgrades] ******************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [common : auto-updates | configure /etc/apt/apt.conf.d/50unattended-upgrades] ************************************
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-worker-01]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-03]

TASK [common : auto-updates | start and enable unattended-upgrades service] *******************************************
ok: [k8s-controller-01]
ok: [k8s-worker-01]
ok: [k8s-controller-02]
ok: [k8s-controller-03]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [common : users | install sudo package] **************************************************************************
ok: [k8s-controller-01]
ok: [k8s-worker-01]
ok: [k8s-controller-02]
ok: [k8s-controller-03]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [common : users | create admin users] ****************************************************************************
changed: [k8s-controller-01] => (item=adminuser)
changed: [k8s-worker-01] => (item=adminuser)
changed: [k8s-controller-03] => (item=adminuser)
changed: [k8s-controller-02] => (item=adminuser)
changed: [k8s-worker-02] => (item=adminuser)
changed: [k8s-worker-03] => (item=adminuser)

TASK [common : users | configure etc/sudoers.d/20_admins_sudo] ********************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-03]

RUNNING HANDLER [common : auto-updates | restart unattended-upgrades service] *****************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [docker | set variables] *****************************************************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/docker/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/docker/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/docker/vars/default.yml)
ok: [k8s-worker-01] => (item=/homelab/ansible/roles/docker/vars/default.yml)
ok: [k8s-worker-02] => (item=/homelab/ansible/roles/docker/vars/default.yml)
ok: [k8s-worker-03] => (item=/homelab/ansible/roles/docker/vars/default.yml)

TASK [docker] *********************************************************************************************************
included: /homelab/ansible/roles/docker/tasks/docker.yml for k8s-controller-01, k8s-controller-02, k8s-controller-03, k8s-worker-01, k8s-worker-02, k8s-worker-03

TASK [docker | install docker key] ************************************************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-03]

TASK [docker | add docker repo] ***************************************************************************************
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-worker-02]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

TASK [docker | install docker engine packages] ************************************************************************
changed: [k8s-controller-03] => (item=docker-ce)
ok: [k8s-controller-03] => (item=docker-ce-cli)
ok: [k8s-controller-03] => (item=containerd.io)
changed: [k8s-worker-01] => (item=docker-ce)
changed: [k8s-controller-01] => (item=docker-ce)
ok: [k8s-worker-01] => (item=docker-ce-cli)
changed: [k8s-worker-02] => (item=docker-ce)
changed: [k8s-controller-02] => (item=docker-ce)
ok: [k8s-controller-01] => (item=docker-ce-cli)
ok: [k8s-worker-02] => (item=docker-ce-cli)
ok: [k8s-controller-02] => (item=docker-ce-cli)
ok: [k8s-controller-01] => (item=containerd.io)
ok: [k8s-worker-01] => (item=containerd.io)
ok: [k8s-worker-02] => (item=containerd.io)
ok: [k8s-controller-02] => (item=containerd.io)
changed: [k8s-worker-03] => (item=docker-ce)
ok: [k8s-worker-03] => (item=docker-ce-cli)
ok: [k8s-worker-03] => (item=containerd.io)

TASK [docker | configure /etc/docker/daemon.json] *********************************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

TASK [docker | configure /etc/containerd/config.toml] *****************************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [docker | start and enable docker service] ***********************************************************************
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-worker-01]
ok: [k8s-controller-02]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [docker | start and enable containerd service] *******************************************************************
ok: [k8s-controller-01]
ok: [k8s-worker-01]
ok: [k8s-controller-02]
ok: [k8s-worker-02]
ok: [k8s-controller-03]
ok: [k8s-worker-03]

RUNNING HANDLER [docker | restart docker] *****************************************************************************
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

RUNNING HANDLER [docker | restart containerd] *************************************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-03]

TASK [kubernetes_common : kubernetes-common | set variables] **********************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-worker-01] => (item=/homelab/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-worker-02] => (item=/homelab/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-worker-03] => (item=/homelab/ansible/roles/kubernetes_common/vars/default.yml)

TASK [kubernetes_common : swap | disable swap] ************************************************************************
skipping: [k8s-controller-01]
skipping: [k8s-controller-02]
skipping: [k8s-controller-03]
skipping: [k8s-worker-01]
skipping: [k8s-worker-02]
skipping: [k8s-worker-03]

TASK [kubernetes_common : swap | disable swap on system start] ********************************************************
ok: [k8s-controller-03] => (item=swap)
ok: [k8s-controller-01] => (item=swap)
ok: [k8s-worker-01] => (item=swap)
ok: [k8s-worker-02] => (item=swap)
ok: [k8s-controller-02] => (item=swap)
ok: [k8s-controller-01] => (item=none)
ok: [k8s-worker-01] => (item=none)
ok: [k8s-worker-02] => (item=none)
ok: [k8s-controller-03] => (item=none)
ok: [k8s-controller-02] => (item=none)
ok: [k8s-worker-03] => (item=swap)
ok: [k8s-worker-03] => (item=none)

TASK [kubernetes_common : network | configure /etc/modules-load.d/k8s.conf] *******************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-03]

TASK [kubernetes_common : network | configure /etc/sysctl.d/k8s.conf] *************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [kubernetes_common : network | allow kubernetes related tcp ports inbound from all kubernetes hosts] *************
changed: [k8s-controller-01] => (item=['179', '10.1.1.41'])
changed: [k8s-worker-01] => (item=['179', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['179', '10.1.1.41'])
changed: [k8s-worker-02] => (item=['179', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['179', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['179', '10.1.1.42'])
changed: [k8s-worker-01] => (item=['179', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['179', '10.1.1.42'])
changed: [k8s-worker-02] => (item=['179', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['179', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['179', '10.1.1.43'])
changed: [k8s-worker-01] => (item=['179', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['179', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['179', '10.1.1.43'])
changed: [k8s-worker-02] => (item=['179', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['179', '10.1.1.51'])
changed: [k8s-worker-02] => (item=['179', '10.1.1.51'])
changed: [k8s-controller-02] => (item=['179', '10.1.1.51'])
changed: [k8s-worker-01] => (item=['179', '10.1.1.51'])
changed: [k8s-controller-01] => (item=['179', '10.1.1.51'])
changed: [k8s-controller-03] => (item=['179', '10.1.1.52'])
changed: [k8s-worker-02] => (item=['179', '10.1.1.52'])
changed: [k8s-controller-02] => (item=['179', '10.1.1.52'])
changed: [k8s-worker-01] => (item=['179', '10.1.1.52'])
changed: [k8s-controller-01] => (item=['179', '10.1.1.52'])
changed: [k8s-controller-02] => (item=['179', '10.1.1.53'])
changed: [k8s-worker-02] => (item=['179', '10.1.1.53'])
changed: [k8s-controller-01] => (item=['179', '10.1.1.53'])
changed: [k8s-worker-01] => (item=['179', '10.1.1.53'])
changed: [k8s-controller-03] => (item=['179', '10.1.1.53'])
changed: [k8s-worker-02] => (item=['5473', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['5473', '10.1.1.41'])
changed: [k8s-worker-01] => (item=['5473', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['5473', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['5473', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['5473', '10.1.1.42'])
changed: [k8s-worker-01] => (item=['5473', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['5473', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['5473', '10.1.1.42'])
changed: [k8s-worker-02] => (item=['5473', '10.1.1.42'])
changed: [k8s-worker-01] => (item=['5473', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['5473', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['5473', '10.1.1.43'])
changed: [k8s-worker-02] => (item=['5473', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['5473', '10.1.1.43'])
changed: [k8s-worker-01] => (item=['5473', '10.1.1.51'])
changed: [k8s-controller-01] => (item=['5473', '10.1.1.51'])
changed: [k8s-controller-03] => (item=['5473', '10.1.1.51'])
changed: [k8s-controller-02] => (item=['5473', '10.1.1.51'])
changed: [k8s-worker-02] => (item=['5473', '10.1.1.51'])
changed: [k8s-controller-01] => (item=['5473', '10.1.1.52'])
changed: [k8s-worker-01] => (item=['5473', '10.1.1.52'])
changed: [k8s-controller-02] => (item=['5473', '10.1.1.52'])
changed: [k8s-worker-02] => (item=['5473', '10.1.1.52'])
changed: [k8s-controller-03] => (item=['5473', '10.1.1.52'])
changed: [k8s-worker-01] => (item=['5473', '10.1.1.53'])
changed: [k8s-controller-01] => (item=['5473', '10.1.1.53'])
changed: [k8s-controller-02] => (item=['5473', '10.1.1.53'])
changed: [k8s-worker-02] => (item=['5473', '10.1.1.53'])
changed: [k8s-controller-03] => (item=['5473', '10.1.1.53'])
changed: [k8s-controller-01] => (item=['9099', '10.1.1.41'])
changed: [k8s-worker-01] => (item=['9099', '10.1.1.41'])
changed: [k8s-worker-02] => (item=['9099', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['9099', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['9099', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['9099', '10.1.1.42'])
changed: [k8s-worker-01] => (item=['9099', '10.1.1.42'])
changed: [k8s-worker-02] => (item=['9099', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['9099', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['9099', '10.1.1.42'])
changed: [k8s-worker-01] => (item=['9099', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['9099', '10.1.1.43'])
changed: [k8s-worker-02] => (item=['9099', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['9099', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['9099', '10.1.1.43'])
changed: [k8s-worker-01] => (item=['9099', '10.1.1.51'])
changed: [k8s-controller-01] => (item=['9099', '10.1.1.51'])
changed: [k8s-controller-02] => (item=['9099', '10.1.1.51'])
changed: [k8s-worker-02] => (item=['9099', '10.1.1.51'])
changed: [k8s-controller-03] => (item=['9099', '10.1.1.51'])
changed: [k8s-worker-01] => (item=['9099', '10.1.1.52'])
changed: [k8s-controller-01] => (item=['9099', '10.1.1.52'])
changed: [k8s-controller-03] => (item=['9099', '10.1.1.52'])
changed: [k8s-worker-02] => (item=['9099', '10.1.1.52'])
changed: [k8s-controller-02] => (item=['9099', '10.1.1.52'])
changed: [k8s-worker-01] => (item=['9099', '10.1.1.53'])
changed: [k8s-controller-01] => (item=['9099', '10.1.1.53'])
changed: [k8s-controller-03] => (item=['9099', '10.1.1.53'])
changed: [k8s-controller-02] => (item=['9099', '10.1.1.53'])
changed: [k8s-worker-02] => (item=['9099', '10.1.1.53'])
changed: [k8s-worker-03] => (item=['179', '10.1.1.41'])
changed: [k8s-worker-03] => (item=['179', '10.1.1.42'])
changed: [k8s-worker-03] => (item=['179', '10.1.1.43'])
changed: [k8s-worker-03] => (item=['179', '10.1.1.51'])
changed: [k8s-worker-03] => (item=['179', '10.1.1.52'])
changed: [k8s-worker-03] => (item=['179', '10.1.1.53'])
changed: [k8s-worker-03] => (item=['5473', '10.1.1.41'])
changed: [k8s-worker-03] => (item=['5473', '10.1.1.42'])
changed: [k8s-worker-03] => (item=['5473', '10.1.1.43'])
changed: [k8s-worker-03] => (item=['5473', '10.1.1.51'])
changed: [k8s-worker-03] => (item=['5473', '10.1.1.52'])
changed: [k8s-worker-03] => (item=['5473', '10.1.1.53'])
changed: [k8s-worker-03] => (item=['9099', '10.1.1.41'])
changed: [k8s-worker-03] => (item=['9099', '10.1.1.42'])
changed: [k8s-worker-03] => (item=['9099', '10.1.1.43'])
changed: [k8s-worker-03] => (item=['9099', '10.1.1.51'])
changed: [k8s-worker-03] => (item=['9099', '10.1.1.52'])
changed: [k8s-worker-03] => (item=['9099', '10.1.1.53'])

TASK [kubernetes_common : network | allow kubernetes related udp ports inbound from all kubernetes hosts] *************
changed: [k8s-controller-01] => (item=['4789', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['4789', '10.1.1.41'])
changed: [k8s-worker-01] => (item=['4789', '10.1.1.41'])
changed: [k8s-worker-02] => (item=['4789', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['4789', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['4789', '10.1.1.42'])
changed: [k8s-worker-02] => (item=['4789', '10.1.1.42'])
changed: [k8s-worker-01] => (item=['4789', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['4789', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['4789', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['4789', '10.1.1.43'])
changed: [k8s-worker-02] => (item=['4789', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['4789', '10.1.1.43'])
changed: [k8s-worker-01] => (item=['4789', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['4789', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['4789', '10.1.1.51'])
changed: [k8s-worker-02] => (item=['4789', '10.1.1.51'])
changed: [k8s-worker-01] => (item=['4789', '10.1.1.51'])
changed: [k8s-controller-01] => (item=['4789', '10.1.1.51'])
changed: [k8s-controller-03] => (item=['4789', '10.1.1.51'])
changed: [k8s-controller-02] => (item=['4789', '10.1.1.52'])
changed: [k8s-controller-01] => (item=['4789', '10.1.1.52'])
changed: [k8s-worker-01] => (item=['4789', '10.1.1.52'])
changed: [k8s-worker-02] => (item=['4789', '10.1.1.52'])
changed: [k8s-controller-03] => (item=['4789', '10.1.1.52'])
changed: [k8s-worker-01] => (item=['4789', '10.1.1.53'])
changed: [k8s-controller-02] => (item=['4789', '10.1.1.53'])
changed: [k8s-worker-02] => (item=['4789', '10.1.1.53'])
changed: [k8s-controller-01] => (item=['4789', '10.1.1.53'])
changed: [k8s-controller-03] => (item=['4789', '10.1.1.53'])
changed: [k8s-worker-03] => (item=['4789', '10.1.1.41'])
changed: [k8s-worker-03] => (item=['4789', '10.1.1.42'])
changed: [k8s-worker-03] => (item=['4789', '10.1.1.43'])
changed: [k8s-worker-03] => (item=['4789', '10.1.1.51'])
changed: [k8s-worker-03] => (item=['4789', '10.1.1.52'])
changed: [k8s-worker-03] => (item=['4789', '10.1.1.53'])

TASK [kubernetes_common : packages | install kubernetes key] **********************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-worker-02]
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-worker-03]

TASK [kubernetes_common : packages | add kubernetes repo] *************************************************************
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [kubernetes_common : packages | install kubernetes packages] *****************************************************
changed: [k8s-worker-01] => (item=kubelet)
changed: [k8s-controller-03] => (item=kubelet)
changed: [k8s-worker-02] => (item=kubelet)
changed: [k8s-controller-02] => (item=kubelet)
changed: [k8s-controller-01] => (item=kubelet)
changed: [k8s-worker-01] => (item=kubeadm)
ok: [k8s-worker-01] => (item=kubectl)
changed: [k8s-controller-03] => (item=kubeadm)
ok: [k8s-controller-03] => (item=kubectl)
changed: [k8s-worker-02] => (item=kubeadm)
ok: [k8s-worker-02] => (item=kubectl)
changed: [k8s-controller-02] => (item=kubeadm)
ok: [k8s-controller-02] => (item=kubectl)
changed: [k8s-controller-01] => (item=kubeadm)
ok: [k8s-controller-01] => (item=kubectl)
changed: [k8s-worker-03] => (item=kubelet)
changed: [k8s-worker-03] => (item=kubeadm)
ok: [k8s-worker-03] => (item=kubectl)

TASK [kubernetes_common : packages | prevent kubernetes from being upgraded] ******************************************
changed: [k8s-controller-01] => (item=kubelet)
changed: [k8s-worker-01] => (item=kubelet)
changed: [k8s-controller-03] => (item=kubelet)
changed: [k8s-controller-02] => (item=kubelet)
changed: [k8s-worker-02] => (item=kubelet)
changed: [k8s-controller-03] => (item=kubeadm)
changed: [k8s-worker-01] => (item=kubeadm)
changed: [k8s-controller-02] => (item=kubeadm)
changed: [k8s-worker-02] => (item=kubeadm)
changed: [k8s-controller-01] => (item=kubeadm)
changed: [k8s-worker-02] => (item=kubectl)
changed: [k8s-controller-02] => (item=kubectl)
changed: [k8s-controller-01] => (item=kubectl)
changed: [k8s-controller-03] => (item=kubectl)
changed: [k8s-worker-01] => (item=kubectl)
changed: [k8s-worker-03] => (item=kubelet)
changed: [k8s-worker-03] => (item=kubeadm)
changed: [k8s-worker-03] => (item=kubectl)

TASK [kubernetes_common : directories | manage kubernetes directories] ************************************************
ok: [k8s-worker-01] => (item=/etc/kubernetes/)
ok: [k8s-controller-01] => (item=/etc/kubernetes/)
ok: [k8s-controller-02] => (item=/etc/kubernetes/)
ok: [k8s-worker-02] => (item=/etc/kubernetes/)
ok: [k8s-controller-03] => (item=/etc/kubernetes/)
changed: [k8s-worker-01] => (item=/etc/kubernetes/pki/)
changed: [k8s-controller-01] => (item=/etc/kubernetes/pki/)
changed: [k8s-controller-03] => (item=/etc/kubernetes/pki/)
changed: [k8s-worker-02] => (item=/etc/kubernetes/pki/)
changed: [k8s-controller-02] => (item=/etc/kubernetes/pki/)
ok: [k8s-worker-03] => (item=/etc/kubernetes/)
changed: [k8s-worker-03] => (item=/etc/kubernetes/pki/)

TASK [kubernetes_common : pki | configure /etc/kubernetes/kubelet.conf] ***********************************************
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [kubernetes_common : pki | configure /etc/kubernetes/pki/ca.crt] *************************************************
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-03]

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]

TASK [pacemaker | set variables] **************************************************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/pacemaker/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/pacemaker/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/pacemaker/vars/default.yml)

TASK [network | allow pacemaker tcp inbound from pacemaker servers] ***************************************************
changed: [k8s-controller-01] => (item=['2224', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['2224', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['2224', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['2224', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['2224', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['2224', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['2224', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['2224', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['2224', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['3121', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['3121', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['3121', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['3121', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['3121', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['3121', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['3121', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['3121', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['3121', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['21064', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['21064', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['21064', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['21064', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['21064', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['21064', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['21064', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['21064', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['21064', '10.1.1.43'])

TASK [network | allow pacemaker udp inbound from pacemaker servers] ***************************************************
changed: [k8s-controller-01] => (item=['5405', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['5405', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['5405', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['5405', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['5405', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['5405', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['5405', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['5405', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['5405', '10.1.1.43'])

TASK [packages | install pacemaker packages] **************************************************************************
changed: [k8s-controller-01] => (item=pacemaker)
ok: [k8s-controller-01] => (item=corosync)
changed: [k8s-controller-03] => (item=pacemaker)
ok: [k8s-controller-03] => (item=corosync)
changed: [k8s-controller-02] => (item=pacemaker)
ok: [k8s-controller-02] => (item=corosync)
changed: [k8s-controller-01] => (item=pcs)
changed: [k8s-controller-01] => (item=crmsh)
changed: [k8s-controller-03] => (item=pcs)
changed: [k8s-controller-02] => (item=pcs)
changed: [k8s-controller-03] => (item=crmsh)
changed: [k8s-controller-02] => (item=crmsh)

TASK [pacemaker : services | start and enable services] ***************************************************************
ok: [k8s-controller-01] => (item=pacemaker)
ok: [k8s-controller-03] => (item=pacemaker)
ok: [k8s-controller-02] => (item=pacemaker)
ok: [k8s-controller-01] => (item=corosync)
ok: [k8s-controller-02] => (item=corosync)
ok: [k8s-controller-03] => (item=corosync)
ok: [k8s-controller-01] => (item=pcsd)
ok: [k8s-controller-02] => (item=pcsd)
ok: [k8s-controller-03] => (item=pcsd)

TASK [pacemaker : corosync | configure /etc/corosync/authkey] *********************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-controller-03]

TASK [pacemaker : corosync | configure /etc/corosync/corosync.conf] ***************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-controller-02]
[WARNING]: flush_handlers task does not support when conditional

RUNNING HANDLER [pacemaker : corosync | restart corosync] *************************************************************
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-controller-02]

TASK [pacemaker : settings | capture cluster properties] **************************************************************
ok: [k8s-controller-01]

TASK [pacemaker : settings | disable stonith] *************************************************************************
changed: [k8s-controller-01]

TASK [kubernetes_controller : kubernetes-controller | set variables] **************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)

TASK [kubernetes_controller : network | allow kubernetes ports inbound from kubernetes controllers] *******************
changed: [k8s-controller-01] => (item=['2379', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['2379', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['2379', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['2379', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['2379', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['2379', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['2379', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['2379', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['2379', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['2380', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['2380', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['2380', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['2380', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['2380', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['2380', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['2380', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['2380', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['2380', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['10250', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['10250', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['10250', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['10250', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['10250', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['10250', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['10250', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['10250', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['10250', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['10251', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['10251', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['10251', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['10251', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['10251', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['10251', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['10251', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['10251', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['10251', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['10252', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['10252', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['10252', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['10252', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['10252', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['10252', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['10252', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['10252', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['10252', '10.1.1.43'])

TASK [kubernetes_controller : network | allow kubernetes api inbound from kubernetes servers] *************************
changed: [k8s-controller-01] => (item=10.1.1.41)
changed: [k8s-controller-03] => (item=10.1.1.41)
changed: [k8s-controller-02] => (item=10.1.1.41)
changed: [k8s-controller-01] => (item=10.1.1.42)
changed: [k8s-controller-03] => (item=10.1.1.42)
changed: [k8s-controller-02] => (item=10.1.1.42)
changed: [k8s-controller-01] => (item=10.1.1.43)
changed: [k8s-controller-03] => (item=10.1.1.43)
changed: [k8s-controller-02] => (item=10.1.1.43)
changed: [k8s-controller-01] => (item=10.1.1.51)
changed: [k8s-controller-03] => (item=10.1.1.51)
changed: [k8s-controller-02] => (item=10.1.1.51)
changed: [k8s-controller-01] => (item=10.1.1.52)
changed: [k8s-controller-03] => (item=10.1.1.52)
changed: [k8s-controller-02] => (item=10.1.1.52)
changed: [k8s-controller-01] => (item=10.1.1.53)
changed: [k8s-controller-03] => (item=10.1.1.53)
changed: [k8s-controller-02] => (item=10.1.1.53)

TASK [kubernetes_controller : network | allow kubernetes api inbound from permitted clients] **************************
changed: [k8s-controller-01] => (item=10.1.3.100)
changed: [k8s-controller-02] => (item=10.1.3.100)
changed: [k8s-controller-03] => (item=10.1.3.100)

TASK [kubernetes_controller : pacemaker | capture configured resources] ***********************************************
ok: [k8s-controller-01]

TASK [kubernetes_controller : pacemaker | create kubernetes-ip resource] **********************************************
changed: [k8s-controller-01] => (item={'resource_id': 'kubernetes-ip', 'action': 'create', 'provider': 'ocf:heartbeat:IPaddr2', 'options': ['ip=10.1.1.150', 'cidr_netmask=24', 'nic=ens3'], 'op': 'monitor', 'op_options': ['interval=30s']})

RUNNING HANDLER [kubernetes_controller : pacemaker | pause to allow floating ip address to come online] ***************
Pausing for 30 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
ok: [k8s-controller-01]

TASK [kubernetes_controller : pacemaker | refresh ip address facts] ***************************************************
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-controller-02]

TASK [kubernetes_controller : directories | manage kubernetes directories] ********************************************
changed: [k8s-controller-01] => (item=/etc/kubernetes/pki/etcd/)
changed: [k8s-controller-03] => (item=/etc/kubernetes/pki/etcd/)
changed: [k8s-controller-02] => (item=/etc/kubernetes/pki/etcd/)
changed: [k8s-controller-02] => (item=/etc/kubernetes/secrets/)
changed: [k8s-controller-01] => (item=/etc/kubernetes/secrets/)
changed: [k8s-controller-03] => (item=/etc/kubernetes/secrets/)
changed: [k8s-controller-01] => (item=/root/.kube/)
changed: [k8s-controller-02] => (item=/root/.kube/)
changed: [k8s-controller-03] => (item=/root/.kube/)

TASK [kubernetes_controller : pki | configure /root/.kube/config] *****************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-controller-02]

TASK [kubernetes_controller : pki | configure /etc/kubernetes/{{ item }}.conf] ****************************************
changed: [k8s-controller-01] => (item=admin)
changed: [k8s-controller-02] => (item=admin)
changed: [k8s-controller-03] => (item=admin)
changed: [k8s-controller-01] => (item=controller-manager)
changed: [k8s-controller-02] => (item=controller-manager)
changed: [k8s-controller-03] => (item=controller-manager)
changed: [k8s-controller-01] => (item=scheduler)
changed: [k8s-controller-03] => (item=scheduler)
changed: [k8s-controller-02] => (item=scheduler)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/{{ item }}.crt] *************************************
changed: [k8s-controller-01] => (item=front-proxy-ca)
changed: [k8s-controller-03] => (item=front-proxy-ca)
changed: [k8s-controller-02] => (item=front-proxy-ca)
changed: [k8s-controller-01] => (item=apiserver-etcd-client)
changed: [k8s-controller-03] => (item=apiserver-etcd-client)
changed: [k8s-controller-02] => (item=apiserver-etcd-client)
changed: [k8s-controller-03] => (item=apiserver)
changed: [k8s-controller-01] => (item=apiserver)
changed: [k8s-controller-02] => (item=apiserver)
changed: [k8s-controller-01] => (item=apiserver-kubelet-client)
changed: [k8s-controller-03] => (item=apiserver-kubelet-client)
changed: [k8s-controller-02] => (item=apiserver-kubelet-client)
changed: [k8s-controller-01] => (item=front-proxy-client)
changed: [k8s-controller-03] => (item=front-proxy-client)
changed: [k8s-controller-02] => (item=front-proxy-client)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/{{ item }}.key] *************************************
changed: [k8s-controller-01] => (item=apiserver-etcd-client)
changed: [k8s-controller-02] => (item=apiserver-etcd-client)
changed: [k8s-controller-03] => (item=apiserver-etcd-client)
changed: [k8s-controller-01] => (item=apiserver)
changed: [k8s-controller-03] => (item=apiserver)
changed: [k8s-controller-02] => (item=apiserver)
changed: [k8s-controller-01] => (item=apiserver-kubelet-client)
changed: [k8s-controller-03] => (item=apiserver-kubelet-client)
changed: [k8s-controller-02] => (item=apiserver-kubelet-client)
changed: [k8s-controller-01] => (item=front-proxy-client)
changed: [k8s-controller-03] => (item=front-proxy-client)
changed: [k8s-controller-02] => (item=front-proxy-client)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/etcd/{{ item }}.crt] ********************************
changed: [k8s-controller-01] => (item=ca)
changed: [k8s-controller-02] => (item=ca)
changed: [k8s-controller-03] => (item=ca)
changed: [k8s-controller-01] => (item=healthcheck-client)
changed: [k8s-controller-02] => (item=healthcheck-client)
changed: [k8s-controller-03] => (item=healthcheck-client)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/etcd/{{ item }}.key] ********************************
changed: [k8s-controller-02] => (item=healthcheck-client)
changed: [k8s-controller-01] => (item=healthcheck-client)
changed: [k8s-controller-03] => (item=healthcheck-client)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/etcd/{{ item }}.crt] ********************************
changed: [k8s-controller-01] => (item=peer)
changed: [k8s-controller-03] => (item=peer)
changed: [k8s-controller-02] => (item=peer)
changed: [k8s-controller-01] => (item=server)
changed: [k8s-controller-02] => (item=server)
changed: [k8s-controller-03] => (item=server)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/etcd/{{ item }}.key] ********************************
changed: [k8s-controller-01] => (item=peer)
changed: [k8s-controller-03] => (item=peer)
changed: [k8s-controller-02] => (item=peer)
changed: [k8s-controller-01] => (item=server)
changed: [k8s-controller-03] => (item=server)
changed: [k8s-controller-02] => (item=server)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/sa.{{ item }}] **************************************
changed: [k8s-controller-01] => (item=key)
changed: [k8s-controller-02] => (item=key)
changed: [k8s-controller-03] => (item=key)
changed: [k8s-controller-01] => (item=pub)
changed: [k8s-controller-02] => (item=pub)
changed: [k8s-controller-03] => (item=pub)

TASK [kubernetes_controller : kubeadm | kubeadm init] *****************************************************************
skipping: [k8s-controller-02]
skipping: [k8s-controller-03]
changed: [k8s-controller-01]

TASK [kubernetes_controller : kubeadm | create join token] ************************************************************
skipping: [k8s-controller-02]
skipping: [k8s-controller-03]
changed: [k8s-controller-01]

TASK [kubernetes_controller : kubeadm | store join token] *************************************************************
changed: [k8s-controller-01]

TASK [kubernetes_controller : kubeadm | join controllers] *************************************************************
skipping: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-controller-03]

TASK [kubernetes_controller : encryption | configure /etc/kubernetes/secrets/encryption-config.yaml] ******************
changed: [k8s-controller-03]
changed: [k8s-controller-02]
changed: [k8s-controller-01]

TASK [kubernetes_controller : encryption | configure /etc/kubernetes/manifests/kube-apiserver.yaml] *******************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]

RUNNING HANDLER [kubernetes_controller : encryption | pause to allow kube-apiserver to redeploy] **********************
Pausing for 60 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
ok: [k8s-controller-02]

TASK [kubernetes_controller : helm | download archived helm binary] ***************************************************
changed: [k8s-controller-03]
changed: [k8s-controller-02]
changed: [k8s-controller-01]

TASK [kubernetes_controller : helm | extract helm binary] *************************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]

TASK [kubernetes_controller : argocd | download argocd binary] ********************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-controller-02]

TASK [kubernetes_controller : kubeseal | download archived kubeseal binary] *******************************************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]

TASK [kubernetes_controller : kubeseal | extract kubeseal binary] *****************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-controller-03]

TASK [kubernetes_controller : git-repo | checkout git-repo] ***********************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-controller-03]

TASK [kubernetes_controller : calico | install calico] ****************************************************************
changed: [k8s-controller-01]

PLAY [k8s_workers] ****************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-worker-02]
ok: [k8s-worker-01]
ok: [k8s-worker-03]

TASK [kubernetes_worker : kubernetes-worker | set variables] **********************************************************
ok: [k8s-worker-01] => (item=/homelab/ansible/roles/kubernetes_worker/vars/default.yml)
ok: [k8s-worker-02] => (item=/homelab/ansible/roles/kubernetes_worker/vars/default.yml)
ok: [k8s-worker-03] => (item=/homelab/ansible/roles/kubernetes_worker/vars/default.yml)

TASK [kubernetes_worker : kubernetes-worker | populate service facts] *************************************************
ok: [k8s-worker-02]
ok: [k8s-worker-01]
ok: [k8s-worker-03]

TASK [kubernetes_worker : network | allow kubelet api inbound from kubernetes controllers] ****************************
changed: [k8s-worker-01] => (item=10.1.1.41)
changed: [k8s-worker-03] => (item=10.1.1.41)
changed: [k8s-worker-02] => (item=10.1.1.41)
changed: [k8s-worker-01] => (item=10.1.1.42)
changed: [k8s-worker-03] => (item=10.1.1.42)
changed: [k8s-worker-02] => (item=10.1.1.42)
changed: [k8s-worker-01] => (item=10.1.1.43)
changed: [k8s-worker-03] => (item=10.1.1.43)
changed: [k8s-worker-02] => (item=10.1.1.43)

TASK [kubernetes_worker : network | allow nodeport services inbound from kubernetes servers] **************************
changed: [k8s-worker-01] => (item=10.1.1.41)
changed: [k8s-worker-02] => (item=10.1.1.41)
changed: [k8s-worker-03] => (item=10.1.1.41)
changed: [k8s-worker-01] => (item=10.1.1.42)
changed: [k8s-worker-03] => (item=10.1.1.42)
changed: [k8s-worker-02] => (item=10.1.1.42)
changed: [k8s-worker-01] => (item=10.1.1.43)
changed: [k8s-worker-03] => (item=10.1.1.43)
changed: [k8s-worker-02] => (item=10.1.1.43)
changed: [k8s-worker-01] => (item=10.1.1.51)
changed: [k8s-worker-03] => (item=10.1.1.51)
changed: [k8s-worker-02] => (item=10.1.1.51)
changed: [k8s-worker-01] => (item=10.1.1.52)
changed: [k8s-worker-03] => (item=10.1.1.52)
changed: [k8s-worker-01] => (item=10.1.1.53)
changed: [k8s-worker-02] => (item=10.1.1.52)
changed: [k8s-worker-03] => (item=10.1.1.53)
changed: [k8s-worker-02] => (item=10.1.1.53)

TASK [kubernetes_worker : kubeadm | create join token] ****************************************************************
changed: [k8s-worker-01 -> k8s-controller-01]

TASK [kubernetes_worker : kubeadm | store join token] *****************************************************************
changed: [k8s-worker-01]

TASK [kubernetes_worker : kubeadm | join workers] *********************************************************************
skipping: [k8s-worker-03]
changed: [k8s-worker-02]
changed: [k8s-worker-01]

PLAY [k8s_bootstrap] **************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-controller-01]
ok: [k8s-controller-02]
ok: [k8s-controller-03]

TASK [kubernetes_bootstrap : kubernetes-bootstrap | set variables] ****************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)

TASK [kubernetes_bootstrap : kubernetes-bootstrap | pause to allow cluster to fully come online] **********************
Pausing for 120 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | manage argocd 'flag' directory] *************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-controller-02]

TASK [kubernetes_bootstrap : argocd | install argocd] *****************************************************************
changed: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | pause to allow argocd to fully deploy] ******************************************
Pausing for 120 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | install core-apps app] **********************************************************
changed: [k8s-controller-01]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=98   changed=68   unreachable=0    failed=0    skipped=3    rescued=0    ignored=0   
k8s-controller-02          : ok=86   changed=61   unreachable=0    failed=0    skipped=4    rescued=0    ignored=0   
k8s-controller-03          : ok=87   changed=61   unreachable=0    failed=0    skipped=4    rescued=0    ignored=0   
k8s-worker-01              : ok=58   changed=37   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   
k8s-worker-02              : ok=56   changed=35   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   
k8s-worker-03              : ok=56   changed=35   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   
</code></pre></div></div>
</div>

Upon logging into the controller we can confirm that ArgoCD is installed and has the `App of Apps` App present.

```
adminuser@k8s-controller-01:~$ sudo argocd app list --core
NAME       CLUSTER                         NAMESPACE      PROJECT  STATUS  HEALTH   SYNCPOLICY  CONDITIONS  REPO                                  PATH                           TARGET
argocd     https://kubernetes.default.svc  argocd-system  default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/argocd-system  main
calico     https://kubernetes.default.svc  calico-system  default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/calico-system  main
core-apps  https://kubernetes.default.svc  argocd-system  default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/apps           main
```

Now we can continue with using the Kubernetes cluster and installing Pi-Hole.

Next up: Kubernetes - Pi-Hole

[homelab-refresh-k8s-gitops]: {% link _posts/2022-01-25-home-lab-refresh-kubernetes-gitops.md %}

[flux]:               https://fluxcd.io/
[flux-issue]:         https://github.com/fluxcd/helm-controller/issues/186
[argocd]:             https://argo-cd.readthedocs.io/en/stable/
[argocd-doc-started]: https://argo-cd.readthedocs.io/en/stable/getting_started/
[argocd-app-of-apps]: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
[argocd-declarative]: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/

[flux-removal-commit]:      https://github.com/eyulf/homelab/commit/f1744df02c977169ed9b9972848e638ee93c0b4e
[argocd-commit]:            https://github.com/eyulf/homelab/commit/07f587292ccda54d1e18dfe4961997c8d4b3bea0
[ansible-argocd-commit]:    https://github.com/eyulf/homelab/commit/d9fc8796f68056bf3e2a824cd0061e90c0efa9ed
[argocd-calico-commit]:     https://github.com/eyulf/homelab/commit/82ae65d9274102b1ee67c374fd82fee339d2a3e6
[ansible-bootstrap-commit]: https://github.com/eyulf/homelab/commit/

[kubernetes-core-apps-chart-yaml]:                   https://github.com/eyulf/homelab/blob/07f587292ccda54d1e18dfe4961997c8d4b3bea0/kubernetes/core/apps/Chart.yaml
[kubernetes-core-apps-templates-argocd-system-yaml]: https://github.com/eyulf/homelab/blob/07f587292ccda54d1e18dfe4961997c8d4b3bea0/kubernetes/core/apps/templates/argocd-system.yaml
[kubernetes-core-apps-values-yaml]:                  https://github.com/eyulf/homelab/blob/07f587292ccda54d1e18dfe4961997c8d4b3bea0/kubernetes/core/apps/values.yaml
[kubernetes-core-argocd-system-chart-yaml]:          https://github.com/eyulf/homelab/blob/07f587292ccda54d1e18dfe4961997c8d4b3bea0/kubernetes/core/argocd-system/Chart.yaml
[kubernetes-core-argocd-system-values-yaml]:         https://github.com/eyulf/homelab/blob/07f587292ccda54d1e18dfe4961997c8d4b3bea0/kubernetes/core/argocd-system/values.yaml
[kubernetes-core-apps-templates-calico-system-yaml]: https://github.com/eyulf/homelab/blob/82ae65d9274102b1ee67c374fd82fee339d2a3e6/kubernetes/core/apps/templates/calico-system.yaml
[kubernetes-core-calico-system-chart-yaml]:          https://github.com/eyulf/homelab/blob/82ae65d9274102b1ee67c374fd82fee339d2a3e6/kubernetes/core/calico-system/Chart.yaml
[kubernetes-core-calico-system-values-yaml]:         https://github.com/eyulf/homelab/blob/82ae65d9274102b1ee67c374fd82fee339d2a3e6/kubernetes/core/calico-system/values.yaml
