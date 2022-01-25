---
layout: post
title: "Home-Lab Refresh: Kubernetes Cluster Gitops"
date: 2022-01-25 21:15 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-kubernetes-gitops
---

With the [Kubernetes Cluster][homelab-refresh-k8s-install] now setup and ready for configuration the next step is to configure it.

Before we get too far though, I made a mistake in not deploying a [CNI provider][kubernetes-networking] into the Kubernetes Cluster as the tools we are using does require this to be configured before they can be used. To rectify this I first needed to pick a CNI provider to use as there are many to choose from. After reviewing the options (a [post by kubevious][kubevious-cni-comparison] was a great help with this) and [performance benchmarks][itnext-cni-benchmark] I elected to use [Calico][calico].

Since I wanted to set the Kubernetes Cluster up to use a gitops workflow for configuration, we also need a tool to assist with this. For Kubernetes there are 2 main choices to achieve this, [Flux][flux] and [Argo CD][argo-cd]. One the surface they appear to be very similar, however, there are [some differences][newstack-gitops-comparison]. I needed to pick one though and will be using Flux simply because it seems to be more straight forward.

1. [Fixing the cluster networking](#fixing-the-cluster-networking)
1. [Flux - Git preparation](#flux---git-preparation)
1. [Flux - Install](#flux---install)
1. [Flux - Bootstrap](#flux---bootstrap)

## Fixing the cluster networking

As we will be using [Helm][helm] on the controller nodes to perform deployments we first need to install it. We can also install Calico once this is done using a Helm chart. This is easily managed using Ansible, which will be used as it forms a requirement for the Kubernetes Cluster to be in a usable state for us to start using Gitops. I've published the [Ansible configuration][ansible-network-commit] that was used to do this.

Since there is no actual workload on this cluster, the quickest and easiest way to rectify this is to simply re-provision it. The process for doing this is much the same as I covered in the [cluster installation][homelab-refresh-k8s-install] so I wont repeat it here. We do need to taint the server resources in Terraform first so that Terraform will forcefully recreate them.

```
[user@workstation kubernetes]$ for server in controller worker; do for host in 1 2 3; do terraform1.1 taint module.k8s-$server-0$host.libvirt_domain.main; done; done
Resource instance module.k8s-controller-01.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-controller-02.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-controller-03.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-worker-01.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-worker-02.libvirt_domain.main has been marked as tainted.
Resource instance module.k8s-worker-03.libvirt_domain.main has been marked as tainted.
[user@workstation kubernetes]$ for server in controller worker; do for host in 1 2 3; do terraform1.1 taint module.k8s-$server-0$host.libvirt_volume.main; done; done
Resource instance module.k8s-controller-01.libvirt_volume.main has been marked as tainted.
Resource instance module.k8s-controller-02.libvirt_volume.main has been marked as tainted.
Resource instance module.k8s-controller-03.libvirt_volume.main has been marked as tainted.
Resource instance module.k8s-worker-01.libvirt_volume.main has been marked as tainted.
Resource instance module.k8s-worker-02.libvirt_volume.main has been marked as tainted.
Resource instance module.k8s-worker-03.libvirt_volume.main has been marked as tainted.
```

The next steps are exactly the same as the ones performed when [installing the cluster][homelab-refresh-k8s-install], to reiterate the commands use to do this are.

```
cd terraform/infrastructure/kubernetes
terraform1.1 apply

cd ../../../k8s-pki
./pki-gen all

cd ../ansible
ansible-playbook -i production k8s-all.yml
```

The only difference here is that it is using a newer Ansible configuration which I've [pushed to Github][ansible-network-commit].

### Ansible variables

The following additional variables have been used for this.

ansible/group_vars/[k8s_controllers.yml][k8s_controllers-yml-network]
```
# Retrieved from https://get.helm.sh/helm-v3.7.2-linux-amd64.tar.gz.sha256sum
helm_binary_checksum: sha256:4ae30e48966aba5f807a4e140dad6736ee1a392940101e4d79ffb4ee86200a9e
helm_version: 'v3.7.2'

calico_version: 'v3.21.4'
```

### Ansible - Helm

The [updated Ansible configuration][ansible-network-commit] will install Helm.

```
[user@workstation ansible]$ ansible-playbook -i production k8s-controllers.yml -t helm

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
[WARNING]: Platform linux on host k8s-controller-02 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-02]
[WARNING]: Platform linux on host k8s-controller-03 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-03]
[WARNING]: Platform linux on host k8s-controller-01 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-01]
[WARNING]: flush_handlers task does not support when conditional

TASK [kubernetes_controller : kubernetes-controller | set variables] **************************************************
ok: [k8s-controller-01] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)

TASK [kubernetes_controller : helm | download archived helm binary] ***************************************************
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-controller-02]

TASK [kubernetes_controller : helm | extract helm binary] *************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-02          : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-03          : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

### Ansible - Calico

The [updated Ansible configuration][ansible-network-commit] will also install Calico via Helm.

```
[user@workstation ansible]$ ansible-playbook -i production k8s-controllers.yml -t calico

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
[WARNING]: Platform linux on host k8s-controller-02 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-02]
[WARNING]: Platform linux on host k8s-controller-01 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-01]
[WARNING]: Platform linux on host k8s-controller-03 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-03]
[WARNING]: flush_handlers task does not support when conditional

TASK [kubernetes_controller : kubernetes-controller | set variables] **************************************************
ok: [k8s-controller-01] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)

TASK [kubernetes_controller : calico | add calico repo to helm] *******************************************************
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-controller-02]

TASK [kubernetes_controller : calico | install calico] ****************************************************************
ok: [k8s-controller-01]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=4    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-02          : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-03          : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

### Confirming in Kubernetes

When this is completed, give the cluster some time to deploy Calico and then confirm that Kubernetes is in a Ready state with all pods running.

```
adminuser@k8s-controller-01:~$ sudo kubectl get nodes
NAME                STATUS   ROLES                  AGE   VERSION
k8s-controller-01   Ready    control-plane,master   26m   v1.23.2
k8s-controller-02   Ready    control-plane,master   23m   v1.23.2
k8s-controller-03   Ready    control-plane,master   23m   v1.23.2
k8s-worker-01       Ready    <none>                 23m   v1.23.2
k8s-worker-02       Ready    <none>                 23m   v1.23.2
k8s-worker-03       Ready    <none>                 23m   v1.23.2
adminuser@k8s-controller-01:~$ sudo kubectl get pods -A
NAMESPACE         NAME                                        READY   STATUS    RESTARTS      AGE
calico-system     calico-kube-controllers-7dddfdd6c9-rbmk4    1/1     Running   0             22m
calico-system     calico-node-69m8j                           1/1     Running   0             22m
calico-system     calico-node-k96sm                           1/1     Running   0             22m
calico-system     calico-node-mg7fc                           1/1     Running   0             22m
calico-system     calico-node-wg2vn                           1/1     Running   0             22m
calico-system     calico-node-x4fjx                           1/1     Running   0             22m
calico-system     calico-node-zbpml                           1/1     Running   0             22m
calico-system     calico-typha-6d57dc9479-fnt8r               1/1     Running   0             22m
calico-system     calico-typha-6d57dc9479-lgs8d               1/1     Running   0             22m
calico-system     calico-typha-6d57dc9479-xs42l               1/1     Running   0             22m
kube-system       coredns-64897985d-44cj9                     1/1     Running   0             26m
kube-system       coredns-64897985d-gck5x                     1/1     Running   0             26m
kube-system       etcd-k8s-controller-01                      1/1     Running   0             26m
kube-system       etcd-k8s-controller-02                      1/1     Running   0             23m
kube-system       etcd-k8s-controller-03                      1/1     Running   0             23m
kube-system       kube-apiserver-k8s-controller-01            1/1     Running   0             26m
kube-system       kube-apiserver-k8s-controller-02            1/1     Running   0             23m
kube-system       kube-apiserver-k8s-controller-03            1/1     Running   0             23m
kube-system       kube-controller-manager-k8s-controller-01   1/1     Running   1 (23m ago)   26m
kube-system       kube-controller-manager-k8s-controller-02   1/1     Running   0             23m
kube-system       kube-controller-manager-k8s-controller-03   1/1     Running   0             23m
kube-system       kube-proxy-2bhtp                            1/1     Running   0             23m
kube-system       kube-proxy-48h44                            1/1     Running   0             23m
kube-system       kube-proxy-57chc                            1/1     Running   0             23m
kube-system       kube-proxy-7dhzm                            1/1     Running   0             24m
kube-system       kube-proxy-h6z2k                            1/1     Running   0             26m
kube-system       kube-proxy-wj8vs                            1/1     Running   0             23m
kube-system       kube-scheduler-k8s-controller-01            1/1     Running   1 (23m ago)   26m
kube-system       kube-scheduler-k8s-controller-02            1/1     Running   0             23m
kube-system       kube-scheduler-k8s-controller-03            1/1     Running   0             23m
tigera-operator   tigera-operator-768d489967-775jd            1/1     Running   0             23m
```

## Flux - Git preparation

Now that the networking is sorted, we can move on to installing Flux on to Kubernetes. Reviewing the [installation docs][flux-install-doc], the git repo that Flux uses can be prepared before bootstrapping. We'll use this method as this gives us more flexibility in the bootstrapping process.

I originally intended on using a separate git repo for the Kubernetes cluster to be managed by flux. Given that this is being used in a homelab environment I will instead use a mono repo for simplicity. This _should_ be split out per Kubernetes cluster in larger, more complex, environments.

Currently the my git repo looks like the following.

```
[user@workstation homelab-infrastructure]$ tree -dL 3
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
├── k8s-pki
└── terraform
    ├── infrastructure
    │   ├── core_services
    │   ├── hypervisors
    │   └── kubernetes
    └── modules
        └── kvm_virtual_machine

22 directories
```

After creating the required Flux directories, it now looks like the following (I've also renamed the repo from `homelab-infrastructure` to `homelab`).

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
├── clusters
│   └── homelab
│       └── flux-system
├── pki
└── terraform
    ├── infrastructure
    │   ├── core_services
    │   ├── hypervisors
    │   └── kubernetes
    └── modules
        └── kvm_virtual_machine

25 directories
```

With this new structure in place, we need to add the [files required by Flux][flux-commit].

```
[user@workstation homelab]$ tree clusters
clusters
└── homelab
    └── flux-system
        ├── gotk-components.yaml
        ├── gotk-sync.yaml
        └── kustomization.yaml

2 directories, 3 files
```

We also need to set up a [Github Personal Access Token][github-token] to use for the bootstrapping process. I could not find any hard documentation for what permissions are required, so I intially created it with full `repo` access and later refined this after bootstrapping to just `repo:status`, `repo_deployment`, and `public_repo `.

## Flux - Install

Now that we have a git repo ready for Flux to use, we need to install Flux on the Kubernetes controllers so that we can bootstrap it. This is done using [updated Ansible configuration][ansible-flux-commit].

### Variables

The following additional variables have been used for this.

ansible/group_vars/[k8s_controllers.yml][k8s_controllers-yml]
```
# Retrieved from https://github.com/fluxcd/flux2/releases/download/v0.25.3/flux_0.25.3_checksums.txt
flux_binary_checksum: sha256:a5e5818f02d1a8fc591de57e4e6055f2f1e001943c84834419fdd26535d18d13
flux_version: '0.25.3'
```

### Commands
```
cd ansible
ansible-playbook -i production k8s-controllers.yml - flux
```

### Output
```
[user@workstation ansible]$ ansible-playbook -i production k8s-controllers.yml -t flux

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
[WARNING]: Platform linux on host k8s-controller-02 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-02]
[WARNING]: Platform linux on host k8s-controller-01 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-01]
[WARNING]: Platform linux on host k8s-controller-03 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-03]
[WARNING]: flush_handlers task does not support when conditional

TASK [kubernetes_controller : kubernetes-controller | set variables] **************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)

TASK [kubernetes_controller : flux | download archived flux binary] ***************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]

TASK [kubernetes_controller : flux | extract flux binary] *************************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-02          : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-03          : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

## Flux - Bootstrap

While we could use ansible to run this bootstrap process, I wanted to run it manually for a number of reasons. Firstly this eliminates the need to have the Github Personal Access Token retrievable by Ansible, secondly I simply just wanted to capture the output.

```
root@k8s-controller-01:~# export GITHUB_TOKEN=supersecretgithubpersonalaccesstoken
root@k8s-controller-01:~# flux bootstrap github \
>   --owner=eyulf \
>   --repository=homelab \
>   --path=clusters/homelab \
>   --personal
► connecting to github.com
► cloning branch "main" from Git repository "https://github.com/eyulf/homelab.git"
✔ cloned repository
► generating component manifests
✔ generated component manifests
✔ committed sync manifests to "main" ("7d2045e4c09d551868ec6bf30692c2b7735bcceb")
► pushing component manifests to "https://github.com/eyulf/homelab.git"
► installing components in "flux-system" namespace
✔ installed components
✔ reconciled components
► determining if source secret "flux-system/flux-system" exists
► generating source secret
✔ public key: ecdsa-sha2-nistp384 AAAA[...truncated...]rZbA==
✔ configured deploy key "flux-system-main-flux-system-./clusters/homelab" for "https://github.com/eyulf/homelab"
► applying source secret "flux-system/flux-system"
✔ reconciled source secret
► generating sync manifests
✔ generated sync manifests
✔ committed sync manifests to "main" ("0bf2bec5fdbf853ccce735826d534d2e912eb0eb")
► pushing sync manifests to "https://github.com/eyulf/homelab.git"
► applying sync manifests
✔ reconciled sync configuration
◎ waiting for Kustomization "flux-system/flux-system" to be reconciled
✔ Kustomization reconciled successfully
► confirming components are healthy
✔ helm-controller: deployment ready
✔ kustomize-controller: deployment ready
✔ notification-controller: deployment ready
✔ source-controller: deployment ready
✔ all components are healthy
```

Flux is now ready to use, looking closer at what it has done on the Kubernetes cluster, there are some new pods present.

```
adminuser@k8s-controller-01:~$ sudo kubectl get pods -n flux-system
NAME                                       READY   STATUS    RESTARTS   AGE
helm-controller-688d5444b-c4mtq            1/1     Running   0          56s
kustomize-controller-856c6868cd-nbwk6      1/1     Running   0          56s
notification-controller-77766855f7-xw22f   1/1     Running   0          56s
source-controller-74766f477b-5lldl         1/1     Running   0          56s
```

Flux has also made a couple of commits to the repo.

```
[user@workstation homelab]$ git log | head -n 17
commit 0bf2bec5fdbf853ccce735826d534d2e912eb0eb
Author: Flux <>
Date:   Tue Jan 25 20:34:37 2022

    Add Flux sync manifests

commit 7d2045e4c09d551868ec6bf30692c2b7735bcceb
Author: Flux <>
Date:   Tue Jan 25 20:34:29 2022

    Add Flux v0.25.3 component manifests

commit e14aa5e735900870d0017c2055b9ccd2dd8dd0e9
Author: Alex <alex@alexgardner.id.au>
Date:   Tue Jan 25 20:31:12 2022

    Reorganise repo and install Flux
```

We are now ready to start using flux to automatically deploy resources to Kubernetes. For the first Flux managed configuration we will setup Pi-Hole.

Next up: Kubernetes - Pi-Hole

[homelab-refresh]:             {% link _posts/2022-01-07-home-lab-refresh.md %}
[homelab-refresh-k8s-install]: {% link _posts/2022-01-22-home-lab-refresh-kubernetes-install.md %}

[flux]:                       https://fluxcd.io/
[argo-cd]:                    https://argo-cd.readthedocs.io/en/stable/
[newstack-gitops-comparison]: https://thenewstack.io/gitops-on-kubernetes-deciding-between-argo-cd-and-flux/
[kubernetes-networking]:      https://kubernetes.io/docs/concepts/cluster-administration/networking/
[kubevious-cni-comparison]:   https://kubevious.io/blog/post/comparing-kubernetes-container-network-interface-cni-providers
[itnext-cni-benchmark]:       https://itnext.io/benchmark-results-of-kubernetes-network-plugins-cni-over-10gbit-s-network-updated-august-2020-6e1b757b9e49
[calico]:                     https://www.tigera.io/project-calico/
[helm]:                       https://helm.sh/
[flux-install-doc]:           https://fluxcd.io/docs/installation/#customize-flux-manifests
[github-token]:               https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

[ansible-network-commit]: https://github.com/eyulf/homelab/tree/b86f1f5851478a6cd9f585ba2d190fd264fc61cf/ansible
[ansible-flux-commit]:    https://github.com/eyulf/homelab/tree/e14aa5e735900870d0017c2055b9ccd2dd8dd0e9/ansible
[flux-commit]:            https://github.com/eyulf/homelab/tree/e14aa5e735900870d0017c2055b9ccd2dd8dd0e9/clusters/homelab/flux-system

[all-yml-network]:             https://github.com/eyulf/homelab/tree/b86f1f5851478a6cd9f585ba2d190fd264fc61cf/ansible/group_vars/all.yml.enc
[k8s_controllers-yml-network]: https://github.com/eyulf/homelab/tree/b86f1f5851478a6cd9f585ba2d190fd264fc61cf/ansible/group_vars/k8s_controllers.yml.enc
[k8s_controllers-yml]: https://github.com/eyulf/homelab/tree/e14aa5e735900870d0017c2055b9ccd2dd8dd0e9/ansible/group_vars/k8s_controllers.yml.enc
