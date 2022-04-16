---
layout: post
title: "Home-Lab Refresh: Kubernetes Cluster PiHole"
date: 2022-04-16 11:34 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-kubernetes-pihole
---

With [Flux replaced with ArgoCD][homelab-refresh-k8s-argocd] on the Kubernetes cluster we can now start to deploy our first app. One of the first items we will be installing is [Pi-Hole][pihole] to provide my home network with network wide ad blocking capabilities. However, installing this will require another networking change to be made to the cluster. Since we previously installed [sealed-secrets on flux][homelab-refresh-k8s-secrets] we will also need to reinstall this using ArgoCD.

The steps for deploying Pi-Hole, starting with the prerequisites are as follows.

1. [Sealed Secrets](#sealed-secrets)
1. [MetalLB](#metallb)
1. [Pi-Hole](#pi-hole)
1. [Next Steps](#next-steps)

## Sealed Secrets

Before we migrated from Flux to ArgoCD, we had Sealed Secrets installed. When I moved from Flux to ArgoCD I did not reinstall Sealed Secrets so we will need to reinstall this using ArgoCD. This is a good chance to show off exactly what is required to install a new service to an existing Kubernetes cluster that is using ArgoCD to deploy services.

### Installation

To deploy Sealed Secrets using ArgoCD we will need to update the git repo with the required files and push the changes to Github. Once the newly commited files are pushed to GitHub, ArgoCD will detect them and sync the changes without intervention needed.

###  Newly created ArgoCD files

The new ArgoCD files we have created are:

1. [kubernetes/core/apps/templates/sealed-secrets.yaml][kubernetes-core-apps-templates-sealed-secrets-yaml]
1. [kubernetes/core/sealed-secrets/Chart.yaml][kubernetes-core-sealed-secrets-chart-yaml]
1. [kubernetes/core/sealed-secrets/values.yaml][kubernetes-core-sealed-secrets-values-yaml]

### Committing to Git

This commit will contain both the Ansible and Flux configuration used for Sealed Secrets.

```
[user@workstation homelab]$ git status
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
  new file:   kubernetes/core/apps/templates/sealed-secrets.yaml
  new file:   kubernetes/core/sealed-secrets/Chart.yaml
  new file:   kubernetes/core/sealed-secrets/values.yaml
```

```
[user@workstation homelab]$ git commit -m 'Add ArgoCD connfiguration for Sealed Secrets'
Ansible-lint.........................................(no files to check)Skipped
Terraform fmt........................................(no files to check)Skipped
Lock terraform provider versions.....................(no files to check)Skipped
Terraform validate with tflint.......................(no files to check)Skipped
Terraform docs.......................................(no files to check)Skipped
Checkov..............................................(no files to check)Skipped
[main 5daa12d] Add ArgoCD connfiguration for Sealed Secrets
```

```
[user@workstation homelab]$ git push 
Enumerating objects: 15, done.
Counting objects: 100% (15/15), done.
Delta compression using up to 16 threads
Compressing objects: 100% (9/9), done.
Writing objects: 100% (10/10), 1.20 KiB | 1.20 MiB/s, done.
Total 10 (delta 1), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
To github.com:eyulf/homelab.git
   8595897..5daa12d  main -> main
```

### Confirm ArgoCD has created resources

The ArgoCD App list shows that ArgoCD has detected the change and has started deploying the new App.

```
adminuser@k8s-controller-01:~$ sudo argocd app list --core
NAME                 CLUSTER                         NAMESPACE       PROJECT  STATUS     HEALTH       SYNCPOLICY  CONDITIONS  REPO                                  PATH                                      TARGET
argocd               https://kubernetes.default.svc  argocd-system   default  Synced     Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/argocd-system             main
calico               https://kubernetes.default.svc  calico-system   default  Synced     Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/calico-system             main
core-apps            https://kubernetes.default.svc  argocd-system   default  Synced     Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/apps                      main
sealed-secrets       https://kubernetes.default.svc  kube-system     default  Synced     Progressing  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/sealed-secrets            main
```

Looking at the new sealed-secrets App itself, we can see a couple of warnings while resources were added. Overall, the App has successfully been deployed.

```
adminuser@k8s-controller-01:~$ sudo argocd app get sealed-secrets --core
Name:               sealed-secrets
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          kube-system
URL:                https://argocd.example.com/applications/sealed-secrets
Repo:               https://github.com/eyulf/homelab.git
Target:             main
Path:               kubernetes/core/sealed-secrets
SyncWindow:         Sync Allowed
Sync Policy:        Automated
Sync Status:        Synced to main (5daa12d)
Health Status:      Healthy

GROUP                      KIND                      NAMESPACE    NAME                       STATUS   HEALTH  HOOK  MESSAGE
                           ServiceAccount            kube-system  sealed-secrets             Synced                 serviceaccount/sealed-secrets created
apiextensions.k8s.io       CustomResourceDefinition  kube-system  sealedsecrets.bitnami.com  Running  Synced        customresourcedefinition.apiextensions.k8s.io/sealedsecrets.bitnami.com created
rbac.authorization.k8s.io  ClusterRole               kube-system  secrets-unsealer           Running  Synced        clusterrole.rbac.authorization.k8s.io/secrets-unsealer reconciled. reconciliation required create
                           missing rules added:
                                               {Verbs:[get list watch] APIGroups:[bitnami.com] Resources:[sealedsecrets] ResourceNames:[] NonResourceURLs:[]}
                                               {Verbs:[update] APIGroups:[bitnami.com] Resources:[sealedsecrets/status] ResourceNames:[] NonResourceURLs:[]}
                                               {Verbs:[get list create update delete] APIGroups:[] Resources:[secrets] ResourceNames:[] NonResourceURLs:[]}
                                               {Verbs:[create patch] APIGroups:[] Resources:[events] ResourceNames:[] NonResourceURLs:[]}. clusterrole.rbac.authorization.k8s.io/secrets-unsealer configured. Warning: resource clusterroles/secrets-unsealer is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by  apply.  apply should only be used on resources created declaratively by either  create --save-config or  apply. The missing annotation will be patched automatically.
rbac.authorization.k8s.io  ClusterRoleBinding  kube-system  sealed-secrets  Running  Synced    clusterrolebinding.rbac.authorization.k8s.io/sealed-secrets reconciled. reconciliation required create
                           missing subjects added:
                                 {Kind:ServiceAccount APIGroup: Name:sealed-secrets Namespace:kube-system}. clusterrolebinding.rbac.authorization.k8s.io/sealed-secrets configured. Warning: resource clusterrolebindings/sealed-secrets is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by  apply.  apply should only be used on resources created declaratively by either  create --save-config or  apply. The missing annotation will be patched automatically.
rbac.authorization.k8s.io  Role  kube-system  sealed-secrets-service-proxier  Synced      role.rbac.authorization.k8s.io/sealed-secrets-service-proxier reconciled. reconciliation required create
                           missing rules added:
                                 {Verbs:[get] APIGroups:[] Resources:[services] ResourceNames:[] NonResourceURLs:[]}
                                 {Verbs:[create get] APIGroups:[] Resources:[services/proxy] ResourceNames:[http:sealed-secrets: sealed-secrets] NonResourceURLs:[]}. role.rbac.authorization.k8s.io/sealed-secrets-service-proxier configured. Warning: resource roles/sealed-secrets-service-proxier is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by  apply.  apply should only be used on resources created declaratively by either  create --save-config or  apply. The missing annotation will be patched automatically.
rbac.authorization.k8s.io  Role  kube-system  sealed-secrets-key-admin  Synced      role.rbac.authorization.k8s.io/sealed-secrets-key-admin reconciled. reconciliation required create
                           missing rules added:
                                        {Verbs:[get] APIGroups:[] Resources:[secrets] ResourceNames:[sealed-secrets-key] NonResourceURLs:[]}
                                        {Verbs:[create list] APIGroups:[] Resources:[secrets] ResourceNames:[] NonResourceURLs:[]}. role.rbac.authorization.k8s.io/sealed-secrets-key-admin configured. Warning: resource roles/sealed-secrets-key-admin is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by  apply.  apply should only be used on resources created declaratively by either  create --save-config or  apply. The missing annotation will be patched automatically.
rbac.authorization.k8s.io  RoleBinding  kube-system  sealed-secrets-service-proxier  Synced      rolebinding.rbac.authorization.k8s.io/sealed-secrets-service-proxier reconciled. reconciliation required create
                           missing subjects added:
                                        {Kind:Group APIGroup:rbac.authorization.k8s.io Name:system:authenticated Namespace:}. rolebinding.rbac.authorization.k8s.io/sealed-secrets-service-proxier configured. Warning: resource rolebindings/sealed-secrets-service-proxier is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by  apply.  apply should only be used on resources created declaratively by either  create --save-config or  apply. The missing annotation will be patched automatically.
rbac.authorization.k8s.io  RoleBinding  kube-system  sealed-secrets-key-admin  Synced      rolebinding.rbac.authorization.k8s.io/sealed-secrets-key-admin reconciled. reconciliation required create
                           missing subjects added:
                                                     {Kind:ServiceAccount APIGroup: Name:sealed-secrets Namespace:kube-system}. rolebinding.rbac.authorization.k8s.io/sealed-secrets-key-admin configured. Warning: resource rolebindings/sealed-secrets-key-admin is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by  apply.  apply should only be used on resources created declaratively by either  create --save-config or  apply. The missing annotation will be patched automatically.
                           Service                   kube-system  sealed-secrets             Synced  Healthy    service/sealed-secrets created
apps                       Deployment                kube-system  sealed-secrets             Synced  Healthy    deployment.apps/sealed-secrets created
apiextensions.k8s.io       CustomResourceDefinition               sealedsecrets.bitnami.com  Synced             
rbac.authorization.k8s.io  ClusterRole                            secrets-unsealer           Synced             
rbac.authorization.k8s.io  ClusterRoleBinding                     sealed-secrets             Synced 
```

The ArgoCD logs show that the sealed-secrets controller has been made and has created a new certificate.

```
adminuser@k8s-controller-01:~$ sudo argocd app logs sealed-secrets --core
2022/02/26 11:15:26 Starting sealed-secrets controller version: 0.17.3
controller version: 0.17.3
2022/02/26 11:15:26 Searching for existing private keys
2022/02/26 11:15:32 New key written to kube-system/sealed-secrets-keydkl8x
2022/02/26 11:15:32 Certificate is
-----BEGIN CERTIFICATE-----
MIIEzTCCArWgAwIBAgIRAIxR19pgKNmTtZYRZtErKgIwDQYJKoZIhvcNAQELBQAw
ADAeFw0yMjAyMjYxMTE1MzJaFw0zMjAyMjQxMTE1MzJaMAAwggIiMA0GCSqGSIb3
DQEBAQUAA4ICDwAwggIKAoICAQC8i0zdbUseb7cLmRu+g49HAUDmhv4ftBnTcDHM
Y0kVWgiCHYd2d5CBEewqUbRrinRezqRlTjApMaET0TEejQfo75/n4swa+6/26AWW
L2mxhk8ksZCp3i6P2oY0HyWbjU4AWaijKfd/E63dcGXCGgtpaIGfQht+GY7HPCG6
y6zAV9Vay0nWvoazbhPCVVqWqzD6OFvj+PTAYFVFzBK+Nd6psMAEwALYVnClD9Ny
C6pEV5vv3rrJb1BtbmeNlXm3L73IZxU8ig80NzCLFNwJjngxnPmgaD4T4kgvqalc
MTgR7Ae2rxWKOOYTAkX2pVHLozq2BkatRjYXPtnAKbtPfSn96RIETFlGkfl+ttYj
MyH3mMr8pzrvyTupMrIs3JWxoBtdpbY77OIYII05ywEQ/P0yDTgevz3Pm49nYpjE
r+gEsChWSBj+lrfZu7Ek9Q9oxJgZQV07MazjOy8LCqeu+AHu695FBxjTr29g03i6
iqXjyKUXgzPQFmHa2PxFMLsa1ok9bLgWENDxbKNOdFt9YEzmZdYeO9NQq8drN80V
kNepbCgsbN4bovUKHJJc24/e+QnNfLHbVp11VG7hzdn0bES5L1gmqJve6UqsND/x
CnQplaQl169/69vBNzuMYKbOtf81GtwiqyxwlTBkPXaGDGJeWJ5S/Kla2a4ZJ4t+
YI7ZiQIDAQABo0IwQDAOBgNVHQ8BAf8EBAMCAAEwDwYDVR0TAQH/BAUwAwEB/zAd
BgNVHQ4EFgQUd27YIKXeh4hbqVlJVUGiiUKVLMkwDQYJKoZIhvcNAQELBQADggIB
AHoo+96m3Q+Qr8b13FJgPRf585OZOJeZs0dwruC6Rt3XgoSEha2WiyPXtQkHj9z8
+Uy5qQpk6iXYBQUbXFhYcWyEgYP07v4Ya2tgi+pV1whj2YN5jUYsVSXf66d1se78
zPauHEKC2y5k3RVUvfkzmxO9nUkReOqF2zOxg18sqtGOjrP4MowD4TD54cIZoKAu
+X53VJygixQ0OeS9GDrBjA55iEBSb/+2IPMaPAs6Dnf766XvDVY9gxGiSK20qRRS
VatS8qCuKN4p+Bczl7et584R172wznBuJI5VWzPRtlUK4oaawxOBLFUl6raTB0g4
WX/v2TpP+SiW3ao/GJCQ02ApKHphF6umkwd0lmhJFWb479ALjVNzuLPPIfU9Vdyk
MoRBp9Kx4IHMNichFFS1wt4VD8Xqm7yWA9CIlM762UKDAFeD4nWVeK4qWwYJbdCB
Hl2CnX+L4ZfYA/IHYxIA5Lb6kr+jBSXiZ6tMGSInOChc9vtuXgvd8oznYV9/DeQu
3sLJu+R9cxIJDc/5uW9UzOUlStYM0DxjjzwmsvFg61PTIlyPCpnsbfy0owDh0Z+3
WtXxA45FI8E7iUfL9jZJp0xVr7VMOenb1uafHARfeYHzgjXj7RBboLT4v7VHjnQb
TkxudYm1KIJzwEa2yoX4EJJXV6QIvkeVqEFRiJW7CauX
-----END CERTIFICATE-----

2022/02/26 11:15:32 HTTP server serving on :8080
```

Finally, the Sealed Secrets pod is running (and healthy) in the expected namespace.

```
adminuser@k8s-controller-01:~$ sudo kubectl get pods -n kube-system
NAME                                        READY   STATUS    RESTARTS       AGE
coredns-64897985d-lv6h7                     1/1     Running   0              130m
coredns-64897985d-nl7tq                     1/1     Running   0              130m
etcd-k8s-controller-01                      1/1     Running   0              130m
etcd-k8s-controller-02                      1/1     Running   0              127m
etcd-k8s-controller-03                      1/1     Running   0              127m
kube-apiserver-k8s-controller-01            1/1     Running   0              125m
kube-apiserver-k8s-controller-02            1/1     Running   0              125m
kube-apiserver-k8s-controller-03            1/1     Running   0              125m
kube-controller-manager-k8s-controller-01   1/1     Running   1 (127m ago)   130m
kube-controller-manager-k8s-controller-02   1/1     Running   0              127m
kube-controller-manager-k8s-controller-03   1/1     Running   0              127m
kube-proxy-5mfr6                            1/1     Running   0              127m
kube-proxy-fkqqg                            1/1     Running   0              123m
kube-proxy-hmlfb                            1/1     Running   0              130m
kube-proxy-l4mwx                            1/1     Running   0              123m
kube-proxy-mfkfg                            1/1     Running   0              126m
kube-proxy-pqztg                            1/1     Running   0              123m
kube-scheduler-k8s-controller-01            1/1     Running   1 (127m ago)   130m
kube-scheduler-k8s-controller-02            1/1     Running   0              127m
kube-scheduler-k8s-controller-03            1/1     Running   0              127m
sealed-secrets-8487b9f48c-qcbvl             1/1     Running   0              3m15s
```

## MetalLB

We will need a way to provide an IP address external to Kubernetes so that the rest of the network outside of Kubernetes can connect to Pi-Hole on port 53. The way to do this for bare-metal Kubernetes clusters, of which ours is, is to use [MetalLB][metallb]. MetalLB will allow a Kubernetes `LoadBalancer` resource to receive an IP address from a pre-configured pool of IP addresses that can be accessible from outside of the Kubernetes cluster.

### Installation

To deploy MetalLB using ArgoCD by updating the git repo, we will use the [Helm Chart][metallb-helm] and will need to add the required files to the git repo and push the changes to Github. This will be very similar to the process we just used to install Sealed Secrets.

I have created/edited the following files:

1. [ansible/roles/kubernetes_bootstrap/tasks/argocd.yml][ansible-roles-kubernetes-bootstrap-tasks-argocd-yml]
1. [kubernetes/infrastructure/apps/Chart.yaml][kubernetes-infrastructure-apps-chart-yaml]
1. [kubernetes/infrastructure/apps/templates/metallb.yaml][kubernetes-infrastructure-apps-templates-metallb-yaml]
1. [kubernetes/infrastructure/apps/values.yaml][kubernetes-infrastructure-apps-values-yaml]
1. [kubernetes/infrastructure/metallb/Chart.yaml][kubernetes-infrastructure-metallb-chart-yaml]
1. [kubernetes/infrastructure/metallb/values.yaml][kubernetes-infrastructure-metallb-values-yaml]

These were committed to the git repo and pushed to Github.

```
[user@workstation homelab]$ git commit -m 'Add MetalLB configuration'
Ansible-lint.............................................................Passed
Terraform fmt........................................(no files to check)Skipped
Lock terraform provider versions.....................(no files to check)Skipped
Terraform validate with tflint.......................(no files to check)Skipped
Terraform docs.......................................(no files to check)Skipped
Checkov..............................................(no files to check)Skipped
[main 1d11148] Add MetalLB configuration
 6 files changed, 74 insertions(+)
 create mode 100644 kubernetes/infrastructure/apps/Chart.yaml
 create mode 100644 kubernetes/infrastructure/apps/templates/metallb.yaml
 create mode 100644 kubernetes/infrastructure/apps/values.yaml
 create mode 100644 kubernetes/infrastructure/metallb/Chart.yaml
 create mode 100644 kubernetes/infrastructure/metallb/values.yaml
```
```
[user@workstation homelab]$ git push 
Enumerating objects: 24, done.
Counting objects: 100% (24/24), done.
Delta compression using up to 16 threads
Compressing objects: 100% (16/16), done.
Writing objects: 100% (17/17), 1.75 KiB | 1.75 MiB/s, done.
Total 17 (delta 4), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (4/4), completed with 4 local objects.
To github.com:eyulf/homelab.git
   5daa12d..1d11148  main -> main
```

Now we need to install the infrastructure `App of Apps` App, this is done using Ansible.

```
[user@workstation ansible]$ ansible-playbook -i production k8s-controllers.yml -t kubernetes-bootstrap

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-controller-01]
ok: [k8s-controller-02]
ok: [k8s-controller-03]
[WARNING]: flush_handlers task does not support when conditional

TASK [kubernetes_bootstrap : kubernetes-bootstrap | set variables] ****************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)

TASK [kubernetes_bootstrap : kubernetes-bootstrap | pause to allow cluster to fully come online] **********************
Pausing for 120 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
Press 'C' to continue the play or 'A' to abort 
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | manage argocd 'flag' directory] *************************************************
ok: [k8s-controller-01]
ok: [k8s-controller-03]
ok: [k8s-controller-02]

TASK [kubernetes_bootstrap : argocd | install argocd] *****************************************************************
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | pause to allow argocd to fully deploy] ******************************************
Pausing for 120 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
Press 'C' to continue the play or 'A' to abort 
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | install core-apps app] **********************************************************
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | install infrastructure-apps app] ************************************************
changed: [k8s-controller-01]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=8    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-02          : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-03          : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

Now we can see the MetalLB App present in ArgoCD and the MetalLB pods have been created in the expected namespace.

```
adminuser@k8s-controller-01:~$ sudo argocd app list --core
NAME                 CLUSTER                         NAMESPACE       PROJECT  STATUS  HEALTH       SYNCPOLICY  CONDITIONS  REPO                                  PATH                               TARGET
argocd               https://kubernetes.default.svc  argocd-system   default  Synced  Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/argocd-system      main
calico               https://kubernetes.default.svc  calico-system   default  Synced  Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/calico-system      main
core-apps            https://kubernetes.default.svc  argocd-system   default  Synced  Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/apps               main
infrastructure-apps  https://kubernetes.default.svc  argocd-system   default  Synced  Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/infrastructure/apps     main
metallb              https://kubernetes.default.svc  metallb-system  default  Synced  Progressing  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/infrastructure/metallb  main
sealed-secrets       https://kubernetes.default.svc  kube-system     default  Synced  Healthy      Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/sealed-secrets     main
```

```
adminuser@k8s-controller-01:~$ sudo kubectl get pods -n metallb-system
NAME                               READY   STATUS    RESTARTS   AGE
metallb-controller-c55c89d-smskf   1/1     Running   0          2m44s
metallb-speaker-8x6g7              1/1     Running   0          2m45s
metallb-speaker-cglgc              1/1     Running   0          2m45s
metallb-speaker-mphxz              1/1     Running   0          2m45s
metallb-speaker-nfchk              1/1     Running   0          2m45s
metallb-speaker-sh4hh              1/1     Running   0          2m45s
metallb-speaker-vgprk              1/1     Running   0          2m45s
```

### Testing

So now we have MetalLB deployed to our Kubernetes cluster, we have already configured it to specify what IP addresses to use when assigning IPs. Using the following [`values.yaml`][kubernetes-infrastructure-metallb-values-yaml] file.

```
---
metallb:
  configInline:
    address-pools:
    - name: default
      protocol: layer2
      addresses:
      - 10.1.1.70-10.1.1.110
```

We can confirm that this works by temporarily creating a `Service` that has the type of `LoadBalancer`.

```
adminuser@k8s-controller-01:~$ sudo kubectl create service loadbalancer nginx --tcp=80:80
service/nginx created
adminuser@k8s-controller-01:~$ sudo kubectl get all
NAME                 TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
service/kubernetes   ClusterIP      10.96.0.1      <none>        443/TCP        29m
service/nginx        LoadBalancer   10.108.19.17   10.1.1.70     80:31271/TCP   19s
```

We can see this works because the `LoadBalancer` resource was configured with an External IP instead of being left as `<Pending>`. Now we can deploy Pi-Hole with an IP address that can be accessed from outside of Kubernetes.

## Pi-Hole

With MetalLB installed, we can now deploy Pi-Hole. The process for this is now familiar as we've done it a couple of times. However, we will use sealed-secrets to manage the password for the admin interface.

### Installation

As with previous deployments, we need to add the required files to the git repo and push the changes to Github. I've also updated the Ansible bootstrapping.

I have created/edited the following files:

1. [ansible/roles/kubernetes_bootstrap/handlers/main.yml][ansible-roles-kubernetes-bootstrap-handlers-main-yml]
1. [ansible/roles/kubernetes_bootstrap/tasks/argocd.yml][ansible-roles-kubernetes-bootstrap-tasks-argocd-yml2]
1. [ansible/roles/kubernetes_bootstrap/tasks/main.yml][ansible-roles-kubernetes-bootstrap-tasks-main-yml]
1. [ansible/roles/kubernetes_controller/handlers/main.yml][ansible-roles-kubernetes-controller-handlers-main-yml]
1. [ansible/roles/kubernetes_controller/tasks/calico.yml][ansible-roles-kubernetes-controller-tasks-calico-yml]
1. [kubernetes/apps/apps/Chart.yaml][kubernetes-apps-apps-chart-yaml]
1. [kubernetes/apps/apps/templates/pihole.yaml][kubernetes-apps-apps-templates-pihole-yaml]
1. [kubernetes/apps/apps/values.yaml][kubernetes-apps-apps-values-yaml]
1. [kubernetes/apps/pihole/Chart.yaml][kubernetes-apps-pihole-chart-yaml]
1. [kubernetes/apps/pihole/values.yaml][kubernetes-apps-pihole-values-yaml]

The `kubernetes/apps/pihole/values.yaml` file was [edited again][kubernetes-apps-pihole-values-yaml2], with some intial configuration.

These were committed to the git repo and pushed to Github. Now we need to install the Apps `App of Apps` App, this is done using Ansible.

```
[user@workstation ansible]$ ansible-playbook -i production k8s-controllers.yml -t kubernetes-bootstrap

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]
[WARNING]: flush_handlers task does not support when conditional

TASK [kubernetes_bootstrap : kubernetes-bootstrap | set variables] ****************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_bootstrap/vars/default.yml)

TASK [kubernetes_bootstrap : kubernetes-bootstrap | pause to allow cluster to fully come online] **********************
Pausing for 150 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
Press 'C' to continue the play or 'A' to abort 
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | manage argocd 'flag' directory] *************************************************
ok: [k8s-controller-01]
ok: [k8s-controller-03]
ok: [k8s-controller-02]

TASK [kubernetes_bootstrap : argocd | install argocd] *****************************************************************
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | install core-apps app] **********************************************************
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | install infrastructure-apps app] ************************************************
ok: [k8s-controller-01]

TASK [kubernetes_bootstrap : argocd | install apps-apps app] **********************************************************
changed: [k8s-controller-01]

RUNNING HANDLER [kubernetes_bootstrap : argocd | pause to allow apps-apps app to fully deploy] ************************
Pausing for 150 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
ok: [k8s-controller-01]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=10   changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-02          : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-03          : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

Now we can see the Pi-Hole App present in ArgoCD and the Pi-Hole services has been created in the expected namespace.

```
adminuser@k8s-controller-01:~$ sudo argocd app list --core
NAME                 CLUSTER                         NAMESPACE       PROJECT  STATUS  HEALTH   SYNCPOLICY  CONDITIONS  REPO                                  PATH                               TARGET
apps-apps            https://kubernetes.default.svc  argocd-system   default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/apps/apps               main
argocd               https://kubernetes.default.svc  argocd-system   default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/argocd             main
calico               https://kubernetes.default.svc  calico-system   default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/calico             main
core-apps            https://kubernetes.default.svc  argocd-system   default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/apps               main
infrastructure-apps  https://kubernetes.default.svc  argocd-system   default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/infrastructure/apps     main
metallb              https://kubernetes.default.svc  metallb-system  default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/infrastructure/metallb  main
pihole               https://kubernetes.default.svc  pihole          default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/apps/pihole             main
sealed-secrets       https://kubernetes.default.svc  kube-system     default  Synced  Healthy  Auto        <none>      https://github.com/eyulf/homelab.git  kubernetes/core/sealed-secrets     main
```

```
adminuser@k8s-controller-01:~$ sudo kubectl get all -n pihole
NAME                          READY   STATUS    RESTARTS   AGE
pod/pihole-5bf984cbbd-wbjdg   1/1     Running   0          91s

NAME                     TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
service/pihole-dns-tcp   LoadBalancer   10.104.58.179   10.1.1.70     53:30323/TCP                 92s
service/pihole-dns-udp   LoadBalancer   10.98.168.167   10.1.1.70     53:30668/UDP                 92s
service/pihole-web       LoadBalancer   10.101.232.24   10.1.1.70     80:30357/TCP,443:32031/TCP   92s

NAME                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/pihole   1/1     1            1           92s

NAME                                DESIRED   CURRENT   READY   AGE
replicaset.apps/pihole-5bf984cbbd   1         1         1       91s
```

### Secrets

We've already done some basic configuration on the [`kubernetes/apps/pihole/values.yaml`][kubernetes-apps-pihole-values-yaml2] file. The avaliable settings for the Helm chart are [shown on ArtifactHub][artifacthub-pihole]. The only remaining configuration we want is the secret for the password.

```
---
pihole:
  image:
    tag: '2022.02.1'
  serviceWeb:
    loadBalancerIP: 10.1.1.70
    annotations:
      metallb.universe.tf/allow-shared-ip: pihole-svc
    type: LoadBalancer
  serviceDns:
    loadBalancerIP: 10.1.1.70
    annotations:
      metallb.universe.tf/allow-shared-ip: pihole-svc
    type: LoadBalancer
  serviceDhcp:
    enabled: false
  podDnsConfig:
    enabled: true
    policy: "None"
    nameservers:
    - 127.0.0.1
    - 1.1.1.1
  DNS1: 1.1.1.1
  DNS2: 1.0.0.1
```

So that we have the ability to recreate the Sealed Secrets controller without needing to recreate the secrets, we need to update Sealed Secrets to use a pre-generated certificate. This will be useful if I want to rebuild the Kubernetes Cluster without needing to manually rotate secrets afterwards. The Sealed Secrets documentation covers [bringing your own certificate][sealed-secrets-bring-own].

Firstly I've [updated the `pki-gen`][pki-pki-gen] script to create the Certificate and Private Key required for this.

```
user@workstation pki]$ ./pki-gen sealed_secrets
Generating a RSA private key
..................................................++++
...............................................................................................................................++++
writing new private key to 'sealed-secrets.key'
-----
```

Ansible [has been updated][ansible-roles-kubernetes-controller-tasks-kubeseal-yml] to deploy the new certificates to the Cluster as a Secret in the `kube-system` namespace.

```
user@workstation ansible]$ ansible-playbook -i production k8s-controllers.yml -t kubeseal

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]
[WARNING]: flush_handlers task does not support when conditional

TASK [kubernetes_controller : kubernetes-controller | set variables] **************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)

TASK [kubernetes_controller : kubeseal | download archived kubeseal binary] *******************************************
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-controller-02]

TASK [kubernetes_controller : kubeseal | extract kubeseal binary] *****************************************************
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-controller-02]

TASK [kubernetes_controller : kubeseal | configure /etc/kubernetes/secrets/sealed-secrets.yaml] ***********************
changed: [k8s-controller-01]
changed: [k8s-controller-02]
changed: [k8s-controller-03]

TASK [kubernetes_controller : kubeseal | apply /etc/kubernetes/secrets/sealed-secrets.yaml] ***************************
changed: [k8s-controller-01]

RUNNING HANDLER [kubernetes_controller : kubeseal | apply sealed-secrets label to custom-sealed-secrets-key secret] ***
changed: [k8s-controller-01]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=7    changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-02          : ok=5    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-03          : ok=5    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

Next we need to delete the current sealed-secrets controller pod so that it recreates and uses the new certificate.

```
adminuser@k8s-controller-01:~$ sudo kubectl get pod sealed-secrets-8487b9f48c-qcqlt -n kube-system
NAME                              READY   STATUS    RESTARTS   AGE
sealed-secrets-8487b9f48c-qcqlt   1/1     Running   0          5d23h
```

```
adminuser@k8s-controller-01:~$ sudo kubectl delete pod sealed-secrets-8487b9f48c-qcqlt -n kube-system
pod "sealed-secrets-8487b9f48c-qcqlt" deleted
```

```
adminuser@k8s-controller-01:~$ sudo kubectl get pod sealed-secrets-8487b9f48c-xfk6q -n kube-system
NAME                              READY   STATUS    RESTARTS   AGE
sealed-secrets-8487b9f48c-xfk6q   1/1     Running   0          27s
```

Now we can create the Pi-Hole password Secret using the new pre-generated certificate.

```
user@workstation homelab]$ kubectl create secret generic admin-password \
--from-literal=password=mysupersecretpasword \
--dry-run=client -o yaml | kubeseal \
--cert "ansible/roles/kubernetes_controller/files/etc/kubernetes/secrets/sealed-secrets.pem" -n pihole -o yaml \
> kubernetes/apps/pihole/secrets/admin-password.yaml
```

This new sercrets file is [commited to git][kubernetes-apps-pihole-secrets-yaml].

1. [kubernetes/apps/pihole/secrets/admin-password.yaml][kubernetes-apps-pihole-secrets-yaml]
```
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  creationTimestamp: null
  name: admin-password
  namespace: pihole
spec:
  encryptedData:
    password: AgCVNtBeZZa8qPI2S9Zcbm+80iTVOIzFKEBsebUBrvbM3LKPMGchN/NK4+beTDDmXbxfml6cn/0sUQ7433TD7AhtpXjyQhD9qkU77TUF9Nv/oomkbboF6LPy3TDBTzgNsaK0tj484VMzy5dEJ9aRImdHiY4HDryIUM0M40Oj7zxxurquTB+Smk6tXtW9tizr9r5mMoRVktOMqQjPZTo/jJBBAbvP/x6grxIJOtXZY0vv8BQxgAW4Gu7bA4wPN7jM6odnwv4cVNuOlitjvnlrLsRXUJof/kbdcKmUtaRTurh/sPVKXKZyItwP2Jx/GfWBYA4eSuvh868mkW3/UhNe48T+Fpf4Ew1HR6k1/JTlWI2hUnV92dYxopiP+VY/NTWjzFXXzCwx/jNQwINFc5DGVD1KyZ3VSrGm4caPpfBEW7u6gVXqigPaFyZL0txyKkEKyhz0Ucc7LEn7zxNfEn6UICRp9sxLP+CTBDSasNnkssjyYno2DWkEBSd40PButWjDcrr7aRORnadSVvazlVUv0oplPYW1mqJFTUtUGZt4IBrh+89i34bx+hCTzbbWXNNv9Ai4qAcM0N+MOeuAdEc2JvPiXjUmSDY/ZcQy+w8xqbZgPU9XDYD9DBWTAfP7MT4Hy6Bg++cKH7C5ZoeDeiXK5MnFn3ubzvNymBXqvg1vZM6L4zmBlj03QwXfmzTgYg0Qt0oKLMVfkuUEWaJT+O8dIv129Md1QVahzFVwuKe3eCc=
  template:
    data: null
    metadata:
      creationTimestamp: null
      name: admin-password
      namespace: pihole
```

Because we deployed Pi-Hole using Helm, we will need to create a [new ArgoCD app][kubernetes-apps-apps-templates-pihole-secrets.yaml] to deploy the new secret.

```
adminuser@k8s-controller-01:~$ sudo argocd app sync apps-apps --core
TIMESTAMP                  GROUP              KIND    NAMESPACE                     NAME    STATUS   HEALTH        HOOK  MESSAGE
2022-04-16T00:00:05+10:00  argoproj.io  Application  argocd-system                pihole    Synced                       
2022-04-16T00:00:06+10:00  argoproj.io  Application  argocd-system                pihole    Synced                       ignored (requires pruning)
2022-04-16T00:00:06+10:00  argoproj.io  Application  argocd-system        pihole-secrets   Running   Synced              application.argoproj.io/pihole-secrets created
2022-04-16T00:00:06+10:00  argoproj.io  Application  argocd-system        pihole-secrets  OutOfSync   Synced              application.argoproj.io/pihole-secrets created

Name:               apps-apps
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          argocd-system
URL:                https://argocd.example.com/applications/apps-apps
Repo:               https://github.com/eyulf/homelab.git
Target:             main
Path:               kubernetes/apps/apps
SyncWindow:         Sync Allowed
Sync Policy:        Automated
Sync Status:        OutOfSync from main (22b2a85)
Health Status:      Healthy

Operation:          Sync
Sync Revision:      22b2a8579a13b0552107d85045c48e6dbbf1904b
Phase:              Succeeded
Start:              2022-04-16 00:00:05 +1000 AEST
Finished:           2022-04-16 00:00:06 +1000 AEST
Duration:           1s
Message:            successfully synced (all tasks run)

GROUP        KIND         NAMESPACE      NAME            STATUS     HEALTH  HOOK  MESSAGE
argoproj.io  Application  argocd-system  pihole          OutOfSync                ignored (requires pruning)
argoproj.io  Application  argocd-system  pihole-secrets  Synced                   application.argoproj.io/pihole-secrets created
FATA[0003] 1 resources require pruning  
```

We also need to update Pi-Hole to use the new password when it is deployed. This is done by editing the [`kubernetes/apps/pihole/values.yaml`][kubernetes-apps-pihole-values-yaml3] file yet again to add the following.

```
  admin:
    existingSecret: "admin-password"
    passwordKey: "password"
```

After pruning the `pihole` app and re-syncing it, Pi-Hole is now ready to use with our new admin password.

```
adminuser@k8s-controller-01:~$ sudo kubectl describe pod pihole-578786b856-4zxsv -n pihole | grep WEBPASSWORD
      WEBPASSWORD:   <set to the key 'password' in secret 'admin-password'>  Optional: false
```

## Next Steps

We've now reached our goal of having a Kubernetes Cluster that can run the `Pi-Hole` application with a custom secret password that can be fully rebuilt at any point with no manual steps required. In fact, I've rebuilt this Cluster following the commits made as part of this post, using my [`rebuild-k8s.sh`][rebuild-k8s] script and was able to login to Pi-Hole with the pre-generated password after 31 minutes. I'm not there yet for rebuilding the entire homelab in the same way, but that is another challenge.

This also makes DNS more complicated in my homelab, which is something I'll cover at a later date. I don't have any immediate next steps other then refining the configuration process and creating proper documentation. This is also probably a good time to start a to-do list...

[homelab-refresh]:             {% link _posts/2022-01-07-home-lab-refresh.md %}
[homelab-refresh-k8s-argocd]:  {% link _posts/2022-02-26-home-lab-refresh-kubernetes-argocd.md %}
[homelab-refresh-k8s-secrets]: {% link _posts/2022-01-29-home-lab-refresh-kubernetes-secrets.md %}

[pihole]:                   https://pi-hole.net/
[metallb]:                  https://metallb.universe.tf/
[metallb-helm]:             https://metallb.universe.tf/installation/#installation-with-helm
[artifacthub-pihole]:       https://artifacthub.io/packages/helm/mojo2600/pihole
[sealed-secrets-bring-own]: https://github.com/bitnami-labs/sealed-secrets/blob/main/docs/bring-your-own-certificates.md
[rebuild-k8s]:              https://github.com/eyulf/homelab/blob/main/rebuild-k8s.sh

[kubernetes-core-apps-templates-sealed-secrets-yaml]: https://github.com/eyulf/homelab/tree/5daa12d89c8ab8cb81528a14ac301949766a7dd3/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml
[kubernetes-core-sealed-secrets-chart-yaml]:          https://github.com/eyulf/homelab/tree/5daa12d89c8ab8cb81528a14ac301949766a7dd3/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml
[kubernetes-core-sealed-secrets-values-yaml]:         https://github.com/eyulf/homelab/tree/5daa12d89c8ab8cb81528a14ac301949766a7dd3/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml

[ansible-roles-kubernetes-bootstrap-tasks-argocd-yml]:   https://github.com/eyulf/homelab/tree/1d1114878f0e86873438f402bb8d9c290afbb7e0/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml
[kubernetes-infrastructure-apps-chart-yaml]:             https://github.com/eyulf/homelab/tree/1d1114878f0e86873438f402bb8d9c290afbb7e0/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml
[kubernetes-infrastructure-apps-templates-metallb-yaml]: https://github.com/eyulf/homelab/tree/1d1114878f0e86873438f402bb8d9c290afbb7e0/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml
[kubernetes-infrastructure-apps-values-yaml]:            https://github.com/eyulf/homelab/tree/1d1114878f0e86873438f402bb8d9c290afbb7e0/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml
[kubernetes-infrastructure-metallb-chart-yaml]:          https://github.com/eyulf/homelab/tree/1d1114878f0e86873438f402bb8d9c290afbb7e0/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml
[kubernetes-infrastructure-metallb-values-yaml]:         https://github.com/eyulf/homelab/tree/1d1114878f0e86873438f402bb8d9c290afbb7e0/kubernetes/infrastructure/homelab/metallb-system/kustomization.yaml

[ansible-roles-kubernetes-bootstrap-handlers-main-yml]:  https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/ansible/roles/kubernetes_bootstrap/handlers/main.yml
[ansible-roles-kubernetes-bootstrap-tasks-argocd-yml2]:  https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/ansible/roles/kubernetes_bootstrap/tasks/argocd.yml
[ansible-roles-kubernetes-bootstrap-tasks-main-yml]:     https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/ansible/roles/kubernetes_bootstrap/tasks/main.yml
[ansible-roles-kubernetes-controller-handlers-main-yml]: https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/ansible/roles/kubernetes_controller/handlers/main.yml
[ansible-roles-kubernetes-controller-tasks-calico-yml]:  https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/ansible/roles/kubernetes_controller/tasks/calico.yml

[kubernetes-apps-apps-chart-yaml]:            https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/kubernetes/apps/apps/Chart.yaml
[kubernetes-apps-apps-templates-pihole-yaml]: https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/kubernetes/apps/apps/templates/pihole.yaml
[kubernetes-apps-apps-values-yaml]:           https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/kubernetes/apps/apps/values.yaml
[kubernetes-apps-pihole-chart-yaml]:          https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/kubernetes/apps/pihole/Chart.yaml
[kubernetes-apps-pihole-values-yaml]:         https://github.com/eyulf/homelab/commit/dba28b58c9bda1a5bb801e1bd4ac6543bd12396f/kubernetes/apps/pihole/values.yaml
[kubernetes-apps-pihole-values-yaml2]:        https://github.com/eyulf/homelab/commit/ce2356f4ad65d6ecc408044f2061b7cf4f5e29fa/kubernetes/apps/pihole/values.yaml

[pki-pki-gen]:                                            https://github.com/eyulf/homelab/commit/71f7e32c6c556a10c690c2b9a387574ab23b7948/pki/pki-gen
[ansible-roles-kubernetes-controller-tasks-kubeseal-yml]: https://github.com/eyulf/homelab/commit/71f7e32c6c556a10c690c2b9a387574ab23b7948/ansible/roles/kubernetes_controller/tasks/kubeseal.yml
[kubernetes-apps-pihole-secrets-yaml]:                    https://github.com/eyulf/homelab/blob/a77bc6d157dbad380c524ca4f03423973a7012ae/kubernetes/apps/pihole/secrets.yaml
[kubernetes-apps-pihole-values-yaml3]:                    https://github.com/eyulf/homelab/blob/a77bc6d157dbad380c524ca4f03423973a7012ae/kubernetes/apps/pihole/values.yaml#L23-L25

[kubernetes-apps-apps-templates-pihole-secrets.yaml]: https://github.com/eyulf/homelab/blob/main/kubernetes/apps/apps/templates/pihole-secrets.yaml
