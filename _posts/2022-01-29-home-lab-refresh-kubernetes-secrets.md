---
layout: post
title: "Home-Lab Refresh: Kubernetes Cluster Secrets"
date: 2022-01-29 15:39 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-kubernetes-secrets
---

With [Flux installed][homelab-refresh-k8s-gitops] on the Kubernetes cluster, we can now make our first configuration change to confirm that the gitops workflow is working as expected. One of the first items we will be installing is [Pi-Hole][pihole] to provide my home network with network wide ad blocking capabilities.

Before we do this though, we need to be able to securely use encrypted secrets in Kubernetes. This will allow us to configure Pi-Hole, and other prerequisites while keeping the configuration fully located in git. I've also slightly restructured the git repo based on the monorepo configuration outlined on the [Flux's Repository Structure][flux-repo-structure] documentation.

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
│   │   └── homelab
│   ├── clusters
│   │   └── homelab
│   └── infrastructure
│       └── homelab
├── pki
└── terraform
    ├── infrastructure
    │   ├── core_services
    │   ├── hypervisors
    │   └── kubernetes
    └── modules
        └── kvm_virtual_machine

29 directories
```

```
[user@workstation homelab]$ tree kubernetes
kubernetes
├── apps
│   └── homelab
├── clusters
│   └── homelab
│       └── flux-system
│           ├── gotk-components.yaml
│           ├── gotk-sync.yaml
│           └── kustomization.yaml
└── infrastructure
    └── homelab

7 directories, 3 files
```

The actual steps for encrypting secrets are as follows.

1. [Sealed Secrets - Flux apply manually](#sealed-secrets---flux-apply-manually)
1. [Sealed Secrets - Flux apply using git](#sealed-secrets---flux-apply-using-git)
1. [Using Sealed Secrets](#using-sealed-secrets)
1. [Encrypting secrets at rest](#encrypting-secrets-at-rest)

## Sealed Secrets - Flux apply manually

Currently I'm using [sops][sops] and [age][age] to provide encryption for this git repo, I did consider also using this for the Kubernetes secrets, but there are a few problems I found with this.

1. Age is only present in the Debian 11+ repos, I am still using 10 at the moment.
1. Both programs do not currently publish SHA-256 hashes of their release binaries.
1. Currently sops has [no active maintainer][sops-maintainer].

The next best alternative to sops appears to be either [git-crypt][git-crypt] or [blackbox][blackbox], however neither of these have native support in Flux like sops does. Also, while searching I have found Bitnami's [Sealed Secrets][sealed-secrets] which appears to fit the bill at lot better then the previous options.

To truly test Flux in action, I decided to manually deploy Sealed Secrets so that we can see what Flux is doing when it deploys configuration. Firstly, since we are using Helm, we needed to get the Helm Chart repo, this is documented in [Sealed Secrets Helm installation][sealed-secrets-helm] instructions.

With the Helm Chart URL in hand, we can now create a Helm Repository source in Flux.

```
adminuser@k8s-controller-01:~$ sudo flux create source helm bitnami-labs \
> --url=https://bitnami-labs.github.io/sealed-secrets \
> --interval=10m
✚ generating HelmRepository source
► applying HelmRepository source
✔ source created
◎ waiting for HelmRepository source reconciliation
✔ HelmRepository source reconciliation completed
✔ fetched revision: 87d0a27ea7f6a483a096e603d3dd0787c348d777634144771b6f68aec056a970
```

Now to view what Flux has done. Flux itself has the source listed, but the repo is not present in Helm itself.

```
adminuser@k8s-controller-01:~$ sudo flux get sources helm
NAME          READY MESSAGE                                                                             REVISION                                                          SUSPENDED 
bitnami-labs  True  Fetched revision: 87d0a27ea7f6a483a096e603d3dd0787c348d777634144771b6f68aec056a970  87d0a27ea7f6a483a096e603d3dd0787c348d777634144771b6f68aec056a970  False  
adminuser@k8s-controller-01:~$ sudo helm repo list
NAME            URL                                  
projectcalico   https://docs.projectcalico.org/charts
```

Next we need to create a Helm Release in Flux, using the source we just created. Firstly we'll check what is currently running in the `flux-system` namespace in Kubernetes.

```
adminuser@k8s-controller-01:~$ sudo kubectl get pods -n flux-system
NAME                                       READY   STATUS    RESTARTS   AGE
helm-controller-688d5444b-ktdlc            1/1     Running   0          4m55s
kustomize-controller-856c6868cd-ktxdq      1/1     Running   0          4m55s
notification-controller-77766855f7-9jj85   1/1     Running   0          4m55s
source-controller-74766f477b-w5f4m         1/1     Running   0          4m55s
```

Now we'll actually create the Helm Release in Flux, the default namespace that this is created in is `flux-system`.

```
adminuser@k8s-controller-01:~$ sudo flux create helmrelease sealed-secrets \
> --interval=10m \
> --source=HelmRepository/bitnami-labs \
> --chart=sealed-secrets \
> --chart-version="2.1.2"
✚ generating HelmRelease
► applying HelmRelease
✔ HelmRelease created
◎ waiting for HelmRelease reconciliation
✔ HelmRelease sealed-secrets is ready
✔ applied revision 2.1.2
```

This has now created a container for Sealed Secrets as shown when viewing the pods in the `flux-system` namespace.

```
adminuser@k8s-controller-01:~$ sudo kubectl get pods -n flux-system
NAME                                       READY   STATUS    RESTARTS   AGE
helm-controller-688d5444b-ktdlc            1/1     Running   0          8m27s
kustomize-controller-856c6868cd-ktxdq      1/1     Running   0          8m27s
notification-controller-77766855f7-9jj85   1/1     Running   0          8m27s
sealed-secrets-8487b9f48c-l6mm9            1/1     Running   0          107s
source-controller-74766f477b-w5f4m         1/1     Running   0          8m27s
```

However, just like before, Helm is not aware of this even though we used Helm Charts to deploy the containers.

```
adminuser@k8s-controller-01:~$ sudo helm repo list
NAME            URL                                  
projectcalico   https://docs.projectcalico.org/charts

root@k8s-controller-01:~# helm ls
NAME    NAMESPACE REVISION  UPDATED                                   STATUS    CHART                   APP VERSION
calico  default   1         2022-01-29 12:57:43.596785463 +1100 AEDT  deployed  tigera-operator-v3.21.4 v3.21.4    
```

Flux on the other hand, is now updated to reflect the changes we have just made.

```
adminuser@k8s-controller-01:~$ sudo flux get all
NAME                      READY MESSAGE                                                         REVISION                                      SUSPENDED 
gitrepository/flux-system True  Fetched revision: main/8323b08ab1dfcb08280709b3ee77d3144d5307ce main/8323b08ab1dfcb08280709b3ee77d3144d5307ce False     

NAME                        READY MESSAGE                                                                             REVISION                                                          SUSPENDED 
helmrepository/bitnami-labs True  Fetched revision: 87d0a27ea7f6a483a096e603d3dd0787c348d777634144771b6f68aec056a970  87d0a27ea7f6a483a096e603d3dd0787c348d777634144771b6f68aec056a970  False     

NAME                                  READY MESSAGE                                             REVISION  SUSPENDED 
helmchart/flux-system-sealed-secrets  True  Pulled 'sealed-secrets' chart with version '2.1.2'. 2.1.2     False     

NAME                        READY MESSAGE                           REVISION  SUSPENDED 
helmrelease/sealed-secrets  True  Release reconciliation succeeded  2.1.2     False     

NAME                      READY MESSAGE                                                         REVISION                                      SUSPENDED 
kustomization/flux-system True  Applied revision: main/8323b08ab1dfcb08280709b3ee77d3144d5307ce main/8323b08ab1dfcb08280709b3ee77d3144d5307ce False     
```

At this point we have used Flux to manually deploy the Sealed Secrets Helm Chart to our Kubernetes cluster. Since the point of using Flux is to work with a gitops workflow though, we will revert our changes so that the cluster is back into it's original state. This is easily done using the Flux CLI, just like deploying the containers above, but in reverse.

```
root@k8s-controller-01:~# sudo flux delete helmrelease sealed-secrets
Are you sure you want to delete this helmreleases: y
► deleting helmreleases sealed-secrets in flux-system namespace
✔ helmreleases deleted
adminuser@k8s-controller-01:~$ sudo flux delete source helm bitnami-labs
Are you sure you want to delete this source helm: y
► deleting source helm bitnami-labs in flux-system namespace
✔ source helm deleted
```

## Sealed Secrets - Flux apply using git

To deploy Sealed Secrets using Flux by updating the git repo, we need to add some files to the git repo and push the changes to Github. We will do this in a similar fashion to the [example provided by Flux][flux-git-example]. The hardest thing about this is getting to grips with the files that are expected, luckily the Flux CLI makes this easy using the `--export` argument. Note that we will be using the `kube-system` namespace for Sealed Secrets.

### Exporting Flux resources

We'll export all of the required Flux resources. Since these commands are being run on the cluster itself, we are not piping them to a file, instead we are just manually copying them over into new files on our workstation.

This source export output will be used in [kubernetes/clusters/homelab/flux-system/sources/bitnami-labs.yaml][clusters-homelab-flux-system-sources-bitnami-labs-yaml]

```
adminuser@k8s-controller-01:~$ sudo flux create source helm bitnami-labs \
> --url=https://bitnami-labs.github.io/sealed-secrets \
> --interval=10m \
> --export
---
apiVersion: source.toolkit.fluxcd.io/v1beta1
kind: HelmRepository
metadata:
  name: bitnami-labs
  namespace: flux-system
spec:
  interval: 10m0s
  url: https://bitnami-labs.github.io/sealed-secrets
```

This helmrelease export output will be used in [kubernetes/infrastructure/homelab/kube-system/sealed-secrets.yaml][infrastructure-homelab-kube-system-sealed-secrets-yaml]

```
adminuser@k8s-controller-01:~$ sudo flux create helmrelease sealed-secrets \
> --interval=10m \
> --source=HelmRepository/bitnami-labs.flux-system \
> --chart=sealed-secrets \
> --chart-version="2.1.2" \
> --namespace=kube-system \
> --export
---
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: sealed-secrets
  namespace: kube-system
spec:
  chart:
    spec:
      chart: sealed-secrets
      sourceRef:
        kind: HelmRepository
        name: bitnami-labs
        namespace: flux-system
      version: 2.1.2
  interval: 10m0s
```

This kustomization export output will be used in [kubernetes/clusters/homelab/infrastructure.yaml][clusters-homelab-infrastructure-yaml]

```
adminuser@k8s-controller-01:~$ sudo flux create kustomization infrastructure \
> --source=GitRepository/flux-system \
> --path="./kubernetes/infrastructure" \
> --interval=10m \
> --export
---
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./kubernetes/infrastructure
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
```

We also need to add a file for the namespace, as well as kustomization files to reference and point to the new files. We will be structuring the repo mostly based on the Flux example, with some other inspiration and my own sensibilities on what makes sense. After adding the new files the repo now looks like the following.

```
[user@workstation homelab]$ tree kubernetes
kubernetes
├── apps
│   └── homelab
├── clusters
│   └── homelab
│       ├── flux-system
│       │   ├── gotk-components.yaml
│       │   ├── gotk-sync.yaml
│       │   ├── kustomization.yaml
│       │   └── sources
│       │       ├── bitnami-labs.yaml
│       │       └── kustomization.yaml
│       └── infrastructure.yaml
└── infrastructure
    └── homelab
        ├── kube-system
        │   ├── kustomization.yaml
        │   ├── namespace.yaml
        │   └── sealed-secrets.yaml
        └── kustomization.yaml

9 directories, 10 files
```

###  Newly created Flux files

The new Flux files we have created are:

1. [kubernetes/clusters/homelab/flux-system/sources/bitnami-labs.yaml][clusters-homelab-flux-system-sources-bitnami-labs-yaml]
```
---
apiVersion: source.toolkit.fluxcd.io/v1beta1
kind: HelmRepository
metadata:
  name: bitnami-labs
  namespace: flux-system
spec:
  interval: 10m0s
  url: https://bitnami-labs.github.io/sealed-secrets
```

1. [kubernetes/clusters/homelab/flux-system/sources/kustomization.yaml][clusters-homelab-flux-system-sources-kustomization-yaml]
```
---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- sources
- metallb-system
```

1. [kubernetes/clusters/homelab/infrastructure.yaml][clusters-homelab-infrastructure-yaml]
```
---
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./kubernetes/infrastructure/homelab
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
```

1. [kubernetes/infrastructure/homelab/kube-system/kustomization.yaml][infrastructure-homelab-kube-system-kustomization-yaml]
```
---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ./namespace.yaml
  - ./sealed-secrets.yaml
```

1. [kubernetes/infrastructure/homelab/kube-system/namespace.yaml][infrastructure-homelab-kube-system-namespace-yaml]
```
---
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
```

1. [kubernetes/infrastructure/homelab/kube-system/sealed-secrets.yaml][infrastructure-homelab-kube-system-sealed-secrets-yaml]
```
---
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: sealed-secrets
  namespace: kube-system
spec:
  chart:
    spec:
      chart: sealed-secrets
      sourceRef:
        kind: HelmRepository
        name: bitnami-labs
        namespace: flux-system
      version: 2.1.2
  interval: 10m0s
```

1. [kubernetes/infrastructure/homelab/kustomization.yaml][infrastructure-homelab-kustomization-yaml]
```
---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - kube-system
```

### Committing to Git

This commit will contain both the Ansible and Flux configuration used for Sealed Secrets.

```
[user@workstation homelab]$ git status
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
  modified:   .ansible-lint
  modified:   ansible/group_vars/k8s_controllers.yml.enc
  new file:   ansible/roles/kubernetes_controller/handlers/main.yml
  modified:   ansible/roles/kubernetes_controller/tasks/directories.yml
  modified:   ansible/roles/kubernetes_controller/tasks/encryption.yml
  new file:   ansible/roles/kubernetes_controller/tasks/kubeseal.yml
  modified:   ansible/roles/kubernetes_controller/tasks/main.yml
  modified:   ansible/roles/kubernetes_controller/tasks/pacemaker.yml
  new file:   ansible/roles/kubernetes_controller/templates/etc/kubernetes/manifests/kube-apiserver.yaml.j2
  renamed:    ansible/roles/kubernetes_controller/templates/var/lib/kubernetes/encryption-config.yaml.j2 -> ansible/roles/kubernetes_controller/templates/etc/kubernetes/secrets/encryption-config.yaml.j2
  deleted:    clusters/homelab/flux-system/gotk-components.yaml
  deleted:    clusters/homelab/flux-system/gotk-sync.yaml
  new file:   kubernetes/clusters/homelab/flux-system/sources/bitnami-labs.yaml
  renamed:    clusters/homelab/flux-system/kustomization.yaml -> kubernetes/clusters/homelab/flux-system/sources/kustomization.yaml
  new file:   kubernetes/clusters/homelab/infrastructure.yaml
  new file:   kubernetes/infrastructure/homelab/kube-system/kustomization.yaml
  new file:   kubernetes/infrastructure/homelab/kube-system/namespace.yaml
  new file:   kubernetes/infrastructure/homelab/kube-system/sealed-secrets.yaml
  new file:   kubernetes/infrastructure/homelab/kustomization.yaml
```
```
[user@workstation homelab]$ git commit -m 'Add Ansible/Flux configuration for Sealed Secrets'
Ansible-lint.............................................................Passed
Terraform fmt........................................(no files to check)Skipped
Lock terraform provider versions.....................(no files to check)Skipped
Terraform validate with tflint.......................(no files to check)Skipped
Terraform docs.......................................(no files to check)Skipped
Checkov..............................................(no files to check)Skipped
[main 0d8c21f] Add Ansible/Flux configuration for Sealed Secrets
 19 files changed, 359 insertions(+), 4366 deletions(-)
 rewrite ansible/group_vars/k8s_controllers.yml.enc (89%)
 create mode 100644 ansible/roles/kubernetes_controller/handlers/main.yml
 create mode 100644 ansible/roles/kubernetes_controller/tasks/kubeseal.yml
 create mode 100644 ansible/roles/kubernetes_controller/templates/etc/kubernetes/manifests/kube-apiserver.yaml.j2
 rename ansible/roles/kubernetes_controller/templates/{var/lib/kubernetes => etc/kubernetes/secrets}/encryption-config.yaml.j2 (66%)
 delete mode 100644 clusters/homelab/flux-system/gotk-components.yaml
 delete mode 100644 clusters/homelab/flux-system/gotk-sync.yaml
 create mode 100644 kubernetes/clusters/homelab/flux-system/sources/bitnami-labs.yaml
 rename {clusters/homelab/flux-system => kubernetes/clusters/homelab/flux-system/sources}/kustomization.yaml (63%)
 create mode 100644 kubernetes/clusters/homelab/infrastructure.yaml
 create mode 100644 kubernetes/infrastructure/homelab/kube-system/kustomization.yaml
 create mode 100644 kubernetes/infrastructure/homelab/kube-system/namespace.yaml
 create mode 100644 kubernetes/infrastructure/homelab/kube-system/sealed-secrets.yaml
 create mode 100644 kubernetes/infrastructure/homelab/kustomization.yaml
```
```
[user@workstation homelab]$ git push 
Enumerating objects: 55, done.
Counting objects: 100% (55/55), done.
Delta compression using up to 16 threads
Compressing objects: 100% (33/33), done.
Writing objects: 100% (38/38), 8.11 KiB | 8.11 MiB/s, done.
Total 38 (delta 12), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (12/12), completed with 9 local objects.
To github.com:eyulf/homelab.git
   8323b08..dd61d82  main -> main
```

### Confirm Flux has created resources

The Flux logs show that the new resources have been reconciled.

```
adminuser@k8s-controller-01:~$ sudo flux logs | tail
2022-01-29T03:49:42.588Z info GitRepository/flux-system.flux-system - Reconciliation finished in 3.887664517s, next run in 1m0s 
2022-01-29T03:50:46.495Z info GitRepository/flux-system.flux-system - Reconciliation finished in 3.906253292s, next run in 1m0s 
2022-01-29T03:51:50.555Z info GitRepository/flux-system.flux-system - Reconciliation finished in 4.057946312s, next run in 1m0s 
2022-01-29T03:52:54.398Z info GitRepository/flux-system.flux-system - Reconciliation finished in 3.841789535s, next run in 1m0s 
2022-01-29T03:53:58.320Z info GitRepository/flux-system.flux-system - Reconciliation finished in 3.91862915s, next run in 1m0s 
2022-01-29T03:54:14.880Z info GitRepository/flux-system.flux-system - Reconciliation finished in 4.250780886s, next run in 1m0s 
2022-01-29T03:54:16.809Z info HelmRepository/bitnami-labs.flux-system - Reconciliation finished in 575.017206ms, next run in 10m0s 
2022-01-29T03:54:17.157Z info HelmRepository/bitnami-labs.flux-system - Reconciliation finished in 348.283042ms, next run in 10m0s 
2022-01-29T03:54:18.082Z info HelmChart/kube-system-sealed-secrets.flux-system - Reconciliation finished in 1.2740638s, next run in 10m0s 
2022-01-29T03:55:19.066Z info GitRepository/flux-system.flux-system - Reconciliation finished in 4.184823614s, next run in 1m0s 
```

Flux itself is updated to contain the new resources

```
adminuser@k8s-controller-01:~$ sudo flux get all
NAME                      READY MESSAGE                                                         REVISION                                      SUSPENDED 
gitrepository/flux-system True  Fetched revision: main/dd61d82fd1b96b7fe51e1a3b392011487ee890ed main/dd61d82fd1b96b7fe51e1a3b392011487ee890ed False     

NAME                        READY MESSAGE                                                                             REVISION                                                          SUSPENDED 
helmrepository/bitnami-labs True  Fetched revision: 87d0a27ea7f6a483a096e603d3dd0787c348d777634144771b6f68aec056a970  87d0a27ea7f6a483a096e603d3dd0787c348d777634144771b6f68aec056a970  False     

NAME                                  READY MESSAGE                                             REVISION  SUSPENDED 
helmchart/kube-system-sealed-secrets  True  Pulled 'sealed-secrets' chart with version '2.1.2'. 2.1.2     False     

NAME                          READY MESSAGE                                                         REVISION                                      SUSPENDED 
kustomization/flux-system     True  Applied revision: main/dd61d82fd1b96b7fe51e1a3b392011487ee890ed main/dd61d82fd1b96b7fe51e1a3b392011487ee890ed False     
kustomization/infrastructure  True  Applied revision: main/dd61d82fd1b96b7fe51e1a3b392011487ee890ed main/dd61d82fd1b96b7fe51e1a3b392011487ee890ed False     
```

Finally, the Sealed Secrets pod is running (and healthy) in the expected namespace.

```
adminuser@k8s-controller-01:~$ sudo kubectl get pods -n kube-system
NAME                                        READY   STATUS    RESTARTS       AGE
coredns-64897985d-r5bnj                     1/1     Running   0              122m
coredns-64897985d-tdvnx                     1/1     Running   0              122m
etcd-k8s-controller-01                      1/1     Running   0              122m
etcd-k8s-controller-02                      1/1     Running   0              121m
etcd-k8s-controller-03                      1/1     Running   0              121m
kube-apiserver-k8s-controller-01            1/1     Running   0              120m
kube-apiserver-k8s-controller-02            1/1     Running   0              120m
kube-apiserver-k8s-controller-03            1/1     Running   0              120m
kube-controller-manager-k8s-controller-01   1/1     Running   1 (121m ago)   122m
kube-controller-manager-k8s-controller-02   1/1     Running   0              121m
kube-controller-manager-k8s-controller-03   1/1     Running   0              121m
kube-proxy-2mp6g                            1/1     Running   0              120m
kube-proxy-5b4sq                            1/1     Running   0              119m
kube-proxy-68z6n                            1/1     Running   0              121m
kube-proxy-dlcvq                            1/1     Running   0              119m
kube-proxy-k7fwq                            1/1     Running   0              119m
kube-proxy-s5p67                            1/1     Running   0              122m
kube-scheduler-k8s-controller-01            1/1     Running   1 (121m ago)   122m
kube-scheduler-k8s-controller-02            1/1     Running   0              121m
kube-scheduler-k8s-controller-03            1/1     Running   0              121m
sealed-secrets-8487b9f48c-xpb5h             1/1     Running   0              3m24s
```

## Using Sealed Secrets

To use Sealed Secrets, we first need to install the client, `kubeseal`. This will need to be run on a machine that can communicate with the Kubernetes API. For simplicity, we will install this directly onto the controllers [using Ansible][ansible-commit-kubeseal]. There is no packaged release for Debian, so we will need to download and extract [the binaries][kubeseal-release] just like we did with Helm and Flux.

Once it's installed, we can use it to generate encrypted secrets that only the Sealed Secrets controller running on this Kubernetes cluster can decrypt.

```
adminuser@k8s-controller-01:~$ sudo kubectl create secret generic test-password \
> --from-literal=password=supersecretpassword \
> --dry-run=client -o yaml | sudo kubeseal \
> --controller-name=sealed-secrets > test-password.yaml
adminuser@k8s-controller-01:~$ cat test-password.yaml 
{
  "kind": "SealedSecret",
  "apiVersion": "bitnami.com/v1alpha1",
  "metadata": {
    "name": "test-password",
    "namespace": "default",
    "creationTimestamp": null
  },
  "spec": {
    "template": {
      "metadata": {
        "name": "test-password",
        "namespace": "default",
        "creationTimestamp": null
      },
      "data": null
    },
    "encryptedData": {
      "password": "AgDBKAd1m2rnB42Z5QIIgwvjz1s0ZznzOSuHMMjXvTcZdDQFwVUDEFijFtL4DsoRBEhoPduBFXqtXwEtvyYR4u9KlIcjiR4fsC5TD1dqLaI085NB/nkvPXVpEDceIG1eOC24tw9U8/Z2fsbZQCjtwQ+Elv8y4cyYLfrl+fqwTMGnbTIp1HqumPi51gt5uGGBi9vjn7TCMPBi1jAwLUsHFPr2bebuLsLGG48Tv95FlctSjRwMwwN71WsakfQHeTzXkjhWcPOiWYT+w6VXiMmGydxXAFExpAQJVFTPnsDlI5DAApuiPu4rAHCadVNXVmMgJ5IDiiz1juYSYmEXjvdC/VvAS0I3C214iowi66h/TTe6yj74ilsB2cRGMjek4PPA4r+5FpbLwx68gDjCx5EhgZiGrrv2ivDyv1KiyeTv2JGea8qxvQTxm7uQIkjgD9eFbrLmFB9PHxiaPZH7Fri38JFkxNl8hw+z5FYdZ8C/IWw97kk1zM+7LGlt/xN/m9yN8J+m2qlTS1zqF8urhLSKyJuL91ZNEkX3iuqdW2Y1bSvir+oRh0Tx2w1G5Bstbw+lEqTeAkx+JImLHOtW/f9kqdHXNg+4hH7SWL3jR8fLBDItgfxSvzIc0TDLEfJ/cIGtwWBMc018tJIUG8y5wyKm05+617NJFbdJ2va4Eqgc6uVRK4zNK9eb/U2bss4SNwq7G8iqAblgXcLUjRFqSevWayo+WEAp"
    }
  }
}
```

### Decrypting secrets

Now to test decryption by temporarily creating the secret resource in Kubernetes.

```
adminuser@k8s-controller-01:~$ sudo kubectl create -f test-password.yaml 
sealedsecret.bitnami.com/test-password created
```
```
adminuser@k8s-controller-01:~$ sudo kubectl describe secret test-password
Name:         test-password
Namespace:    default
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
password:  19 bytes
```

We can then see that the secret is available in Kubernetes as a base64 encoded string, which is [the default setting][kubernetes-secrets].

```
adminuser@k8s-controller-01:~$ sudo kubectl get secret test-password \
> -o yaml | grep 'password:'
  password: c3VwZXJzZWNyZXRwYXNzd29yZA==
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get secret test-password \
> -o yaml | grep 'password:' | awk '{print $2}' | base64 --decode
supersecretpassword
```

This is actually stored in etcd in plain-text, the base64 encoding just acts as a mechanism to get the data in and out of the etcd store.

```
adminuser@k8s-controller-01:~$ sudo kubectl exec -n kube-system etcd-k8s-controller-01 \
> -- etcdctl get /registry/secrets/default/test-password \
> --cert=/etc/kubernetes/pki/etcd/server.crt \
> --key=/etc/kubernetes/pki/etcd/server.key \
> --cacert=/etc/kubernetes/pki/etcd/ca.crt
/registry/secrets/default/test-password
k8s


v1Secret�
�
test-password�default"*$3688cefa-b0a5-46d8-9cd3-d290f5f4285e2��Ώj[

test-password"$ecd88ab1-8257-44da-bf88-294b15828832*bitnami.com/v1alpha10z��

controllerUpdate�v��ΏFieldsV1:�
�{"f:data":{".":{},"f:password":{}},"f:metadata":{"f:ownerReferences":{".":{},"k:{\"uid\":\"ecd88ab1-8257-44da-bf88-294b15828832\"}":{}}},"f:type":{}}B
passwordsupersecretpassword�Opaque�"
```

This currently solves the issue of publicly storing secrets in Github, which we need for Flux to automatically deploy configuration without needing manual intervention. 

However, the lack of encryption at rest is not best practise from a security stand point, and _absolutely_ should not be used in a production setting. For the homelab use case this is an acceptable risk, but we will fix this anyway since Kubernetes does support [encrypting secret data at rest][kubernetes-secrets-at-rest].

## Encrypting secrets at rest

Kubernetes supports [encrypting secret data at rest][kubernetes-secrets-at-rest] which is what we now want to set up. However, I've not been able to find a way as yet for deploying this using Flux, and specifically Kustomize. We are already using Ansible to manage the configuration for this though, we just need to update it to apply the setting and then update the API server configuration.

### Ansible

To apply this setting, we can simply just overwrite the `kube-apiserver.yaml` file that is created by Kubernetes when initializing the cluster. We'll also move the secrets to directory that the api server pods can easily access. As usual the [Ansible configuration][ansible-commit-encryption] for this is on Github.

```
[user@workstation ansible]$ ansible-playbook -i production k8s-controllers.yml -t encryption

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-controller-01]
ok: [k8s-controller-03]
ok: [k8s-controller-02]
[WARNING]: flush_handlers task does not support when conditional

TASK [kubernetes_controller : kubernetes-controller | set variables] **************************************************
ok: [k8s-controller-01] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab/ansible/roles/kubernetes_controller/vars/default.yml)

TASK [kubernetes_controller : encryption | configure /etc/kubernetes/secrets/encryption-config.yaml] ******************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]

TASK [kubernetes_controller : encryption | configure /etc/kubernetes/manifests/kube-apiserver.yaml] *******************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]

RUNNING HANDLER [kubernetes_controller : encryption | pause to allow kube-apiserver to redeploy] **********************
Pausing for 60 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
ok: [k8s-controller-02]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-02          : ok=5    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
k8s-controller-03          : ok=4    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

### Confirming encryption at rest

We'll first create another test password using Sealed Secrets.

```
adminuser@k8s-controller-01:~$ sudo kubectl create secret generic test-password2 \
> --from-literal=password=supersecretpassword2 \
> --dry-run=client -o yaml | sudo kubeseal \
> --controller-name=sealed-secrets > test-password2.yaml
adminuser@k8s-controller-01:~$ sudo kubectl create -f test-password2.yaml 
sealedsecret.bitnami.com/test-password2 created
```

Then confirm how this looks in Kubernetes.

```
adminuser@k8s-controller-01:~$ sudo kubectl describe secret test-password2
Name:         test-password2
Namespace:    default
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
password:  20 bytes
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get secret test-password2 \
> -o yaml | grep 'password:'
  password: c3VwZXJzZWNyZXRwYXNzd29yZDI=
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get secret test-password2 \
> -o yaml | grep 'password:' | awk '{print $2}' | base64 --decode
supersecretpassword2
```

However, when looking at the data on etcd, we can now see that it is actually encrypted.

```
adminuser@k8s-controller-01:~$ sudo kubectl exec -n kube-system etcd-k8s-controller-01 \
> -- etcdctl get /registry/secrets/default/test-password2 \
> --cert=/etc/kubernetes/pki/etcd/server.crt \
> --key=/etc/kubernetes/pki/etcd/server.key \
> --cacert=/etc/kubernetes/pki/etcd/ca.crt
/registry/secrets/default/test-password2
k8s:enc:secretbox:v1:key1:
                          �0�'~I�'/�>�C`��k4��KQ�O�T���KK�I���p>
��[��,���������O6����B�/�msa@��
���:�����FH�ȸ�s�Q
Uq��O�����!��    {8!q���ok��5�l����CLqъ#�n����8��:k�; ��gH��؃aqe5��,#��`w����m��D?��~*�׾����fN
             ȫ��O�[���d���w"�P&Z��(b�ߗ��2���#��{�a��xG9NF4��܃������N��8�=6���C�L�E5�h5PTA�E[��t^�{�ڑ��Κ�IB��h�YP�*�'9���
                   ��%i6���#�5z6�\�Y�v�F��jΕ��!C���v��ޖH�Ȥ7V~��ew�ok��t_��!_p��w�\f�_R��ߪ/&��+��{��
```

So now our secrets are encrypted at rest in the etcd cluster. While this will not likely make a difference in running a homelab Kubernetes cluster, it is still best practise. More importantly it was really easy to set up and use.

Having said that our security posture is still not fantastic, as we have the raw encryption key stored on the controller in plain-text. To improve this we would need to use the `kms` EncryptionConfiguration provider with a cloud based solution. This would be required for use in a production environment, but for our homelab cluster, this is an acceptable risk.

Now we can safely store secrets, we can start to use the Kubernetes cluster and will start by installing Pi-Hole .

Next up: Kubernetes - Pi-Hole

[homelab-refresh-k8s-gitops]: {% link _posts/2022-01-25-home-lab-refresh-kubernetes-gitops.md %}

[pihole]:                     https://pi-hole.net/
[flux-repo-structure]:        https://fluxcd.io/docs/guides/repository-structure/
[age]:                        https://github.com/FiloSottile/age
[sops]:                       https://github.com/mozilla/sops
[sops-maintainer]:            https://github.com/mozilla/sops/discussions/927
[git-crypt]:                  https://github.com/AGWA/git-crypt
[blackbox]:                   https://github.com/StackExchange/blackbox
[sealed-secrets]:             https://github.com/bitnami-labs/sealed-secrets
[sealed-secrets-helm]:        https://github.com/bitnami-labs/sealed-secrets#helm-chart
[flux-git-example]:           https://github.com/fluxcd/flux2-kustomize-helm-example
[kubeseal-release]:           https://github.com/bitnami-labs/sealed-secrets/releases
[kubernetes-secrets]:         https://kubernetes.io/docs/concepts/configuration/secret/
[kubernetes-secrets-at-rest]: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/

[clusters-homelab-flux-system-sources-bitnami-labs-yaml]:  https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/kubernetes/clusters/homelab/flux-system/sources/bitnami-labs.yaml
[clusters-homelab-flux-system-sources-kustomization-yaml]: https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/kubernetes/clusters/homelab/flux-system/sources/kustomization.yaml
[clusters-homelab-infrastructure-yaml]:                    https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/kubernetes/clusters/homelab/infrastructure.yaml
[infrastructure-homelab-kube-system-kustomization-yaml]:   https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/kubernetes/infrastructure/homelab/kube-system/kustomization.yaml
[infrastructure-homelab-kube-system-namespace-yaml]:       https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/kubernetes/infrastructure/homelab/kube-system/namespace.yaml
[infrastructure-homelab-kube-system-sealed-secrets-yaml]:  https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/kubernetes/infrastructure/homelab/kube-system/sealed-secrets.yaml
[infrastructure-homelab-kustomization-yaml]:               https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/kubernetes/infrastructure/homelab/kustomization.yaml
[ansible-commit-kubeseal]:                                 https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/ansible/roles/kubernetes_controller/tasks/kubeseal.yml
[ansible-commit-encryption]:                               https://github.com/eyulf/homelab/tree/dd61d82fd1b96b7fe51e1a3b392011487ee890ed/ansible/roles/kubernetes_controller/tasks/encryption.yml
