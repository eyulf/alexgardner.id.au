---
layout: post
title: "Home-Lab Refresh: Kubernetes Cluster Storage"
date: 2022-06-15 08:16 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-kubernetes-openebs
---

After [installing Traefik][homelab-refresh-k8s-traefik], we now have an reverse proxy so that we can access apps using SSL. Next up is setting up shared [storage volumes][k8s-storage-volumes] so that we can run applications with persistent data. The following blog posts were useful in narrowing down the available options for storage on Kubernetes.

1. [kubevious.io - Comparing Top Storage Solutions for Kubernetes][kubevious-blog-post]
1. [platform9.com - Compare Top Kubernetes Storage Solutions: OpenEBS, Portworx, Rook, & Gluster][platform9-blog-post]
1. [medium.com - Battle of Bytes: Comparing kubernetes storage solutions][rajputvaibhav-medium-post]

I looked further into [OpenEBS][openebs] and after testing it myself will be using it in [cStor mode][openebs-cstor]. One of the highlights for me is the [Container Attached Storage (CAS)][openebs-cas] model. While it was possible to use a distributed storage system outside of Kubernetes, I wanted the storage to not be complex. In terms of potential data-loss events OpenEBS in cStor mode replicates the data across multiple nodes. Because of this the loss of one of the nodes, either at the VM level or the physical hardware itself will not cause data-loss. In the event of the complete loss of Kubernetes, the data can be restored from snapshots that will be stored on my standalone NAS.

The steps for testing and deploying OpenEBS are straightforward, but I did discover one issue with ArgoCD and Helm templates that prompted me to deploy this partially outside of GitOps.

1. [Testing](#testing)
1. [Installation](#installation)
1. [Configuration](#configuration)
1. [Usage](#usage)
1. [Next Steps](#next-steps)

---

## Testing

To see how this works in action, I first manually installed this in the existing Kubernetes Cluster. This is based directly from the [OpenEBS documentation][openebs-cstor-guide]. Firstly, we needed to install iscsi on the worker nodes, I also added an extra disk to the worker VMs at this point. Installing iscsi is quite easy, I ran the following commands on each worker node.

```
sudo apt install open-iscsi -y
sudo systemctl enable --now iscsid
```

Next, we will install OpenEBS itself using Helm.

```
adminuser@k8s-controller-01:~$ sudo helm repo add openebs https://openebs.github.io/charts
"openebs" has been added to your repositories
```
```
adminuser@k8s-controller-01:~$ sudo helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "openebs" chart repository
Update Complete. ⎈Happy Helming!⎈
```
```
adminuser@k8s-controller-01:~$ sudo helm install openebs \
> --namespace openebs-system openebs/openebs --create-namespace --set cstor.enabled=true
NAME: openebs
LAST DEPLOYED: Tue Jun 14 06:29:17 2022
NAMESPACE: openebs-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Successfully installed OpenEBS.

Check the status by running: kubectl get pods -n openebs-system

The default values will install NDM and enable OpenEBS hostpath and device
storage engines along with their default StorageClasses. Use `kubectl get sc`
to see the list of installed OpenEBS StorageClasses.

**Note**: If you are upgrading from the older helm chart that was using cStor
and Jiva (non-csi) volumes, you will have to run the following command to include
the older provisioners:

helm upgrade openebs openebs/openebs \
  --namespace openebs-system \
  --set legacy.enabled=true \
  --reuse-values

For other engines, you will need to perform a few more additional steps to
enable the engine, configure the engines (e.g. creating pools) and create 
StorageClasses. 

For example, cStor can be enabled using commands like:

helm upgrade openebs openebs/openebs \
  --namespace openebs-system \
  --set cstor.enabled=true \
  --reuse-values

For more information, 
- view the online documentation at https://openebs.io/docs or
- connect with an active community on Kubernetes slack #openebs channel.
```
```
adminuser@k8s-controller-01:~$ sudo helm ls -n openebs-system
NAME    NAMESPACE       REVISION  UPDATED                                   STATUS    CHART         APP VERSION
openebs openebs-system  1         2022-06-14 06:29:17.532668455 +1000 AEST  deployed  openebs-3.2.0 3.2.0  
```

With this installed, we can confirm that the resources have been successfully added to the Cluster.

```
adminuser@k8s-controller-01:~$ sudo kubectl get all -n openebs-system
NAME                                                 READY   STATUS    RESTARTS   AGE
pod/openebs-cstor-admission-server-f6dbf8688-9rt77   1/1     Running   0          3m6s
pod/openebs-cstor-csi-controller-0                   6/6     Running   0          3m6s
pod/openebs-cstor-csi-node-8nngb                     2/2     Running   0          3m6s
pod/openebs-cstor-csi-node-bcpn4                     2/2     Running   0          3m6s
pod/openebs-cstor-csi-node-r77xg                     2/2     Running   0          3m6s
pod/openebs-cstor-cspc-operator-5876fd8c-zf9fd       1/1     Running   0          3m6s
pod/openebs-cstor-cvc-operator-6595649458-lrf4s      1/1     Running   0          3m6s
pod/openebs-localpv-provisioner-75457dc575-9bpdg     1/1     Running   0          3m6s
pod/openebs-ndm-7vt4x                                1/1     Running   0          3m6s
pod/openebs-ndm-operator-74dcc95548-szhjl            1/1     Running   0          3m6s
pod/openebs-ndm-phgdl                                1/1     Running   0          3m6s
pod/openebs-ndm-wr6gl                                1/1     Running   0          3m6s

NAME                                     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/openebs-cstor-admission-server   ClusterIP   10.101.157.70   <none>        443/TCP    97s
service/openebs-cstor-cvc-operator-svc   ClusterIP   10.108.84.58    <none>        5757/TCP   3m6s

NAME                                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.apps/openebs-cstor-csi-node   3         3         3       3            3           <none>          3m6s
daemonset.apps/openebs-ndm              3         3         3       3            3           <none>          3m6s

NAME                                             READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/openebs-cstor-admission-server   1/1     1            1           3m6s
deployment.apps/openebs-cstor-cspc-operator      1/1     1            1           3m6s
deployment.apps/openebs-cstor-cvc-operator       1/1     1            1           3m6s
deployment.apps/openebs-localpv-provisioner      1/1     1            1           3m6s
deployment.apps/openebs-ndm-operator             1/1     1            1           3m6s

NAME                                                       DESIRED   CURRENT   READY   AGE
replicaset.apps/openebs-cstor-admission-server-f6dbf8688   1         1         1       3m6s
replicaset.apps/openebs-cstor-cspc-operator-5876fd8c       1         1         1       3m6s
replicaset.apps/openebs-cstor-cvc-operator-6595649458      1         1         1       3m6s
replicaset.apps/openebs-localpv-provisioner-75457dc575     1         1         1       3m6s
replicaset.apps/openebs-ndm-operator-74dcc95548            1         1         1       3m6s

NAME                                            READY   AGE
statefulset.apps/openebs-cstor-csi-controller   1/1     3m6s
```

We also now have OpenEBS `BlockDevice` resources which have been detected automatically.

```
adminuser@k8s-controller-01:~$ sudo kubectl get blockdevices -n openebs-system
NAME                                           NODENAME        SIZE           CLAIMSTATE   STATUS   AGE
blockdevice-60f4d9eb4bcd71524f6ad4add6d03bc5   k8s-worker-01   429495459328   Unclaimed    Active   3m28s
blockdevice-7292e458a0f82fa9c8a7dc487649aa89   k8s-worker-02   429495459328   Unclaimed    Active   3m23s
blockdevice-f6e0f4dbee623276730cb30884f0acd0   k8s-worker-03   429495459328   Unclaimed    Active   3m17s
```

Since we are using cStor, to use the blockdevice resources we will need to create a `CStorPoolCluster` resource. This uses the blockdevices that we found from the previous command.

```
adminuser@k8s-controller-01:~$ cat cspc.yaml
---
apiVersion: cstor.openebs.io/v1
kind: CStorPoolCluster
metadata:
  name: cstor-storage
  namespace: openebs-system
spec:
  pools:
    - nodeSelector:
        kubernetes.io/hostname: "k8s-worker-01"
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: "blockdevice-60f4d9eb4bcd71524f6ad4add6d03bc5"
      poolConfig:
        dataRaidGroupType: "stripe"

    - nodeSelector:
        kubernetes.io/hostname: "k8s-worker-02" 
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: "blockdevice-7292e458a0f82fa9c8a7dc487649aa89"
      poolConfig:
        dataRaidGroupType: "stripe"
   
    - nodeSelector:
        kubernetes.io/hostname: "k8s-worker-03"
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: "blockdevice-f6e0f4dbee623276730cb30884f0acd0"
      poolConfig:
        dataRaidGroupType: "stripe"
```
```
adminuser@k8s-controller-01:~$ sudo kubectl apply -f cspc.yaml
cstorpoolcluster.cstor.openebs.io/cstor-storage created
```

With this created, the claim state of the blockdevices now show as `Claimed`. We can also see that after a few minutes the newly created cStor storage pool is healthy and its instances are online.

```
adminuser@k8s-controller-01:~$ sudo kubectl get blockdevices -n openebs-system
NAME                                           NODENAME        SIZE           CLAIMSTATE   STATUS   AGE
blockdevice-60f4d9eb4bcd71524f6ad4add6d03bc5   k8s-worker-01   429495459328   Claimed      Active   5m15s
blockdevice-7292e458a0f82fa9c8a7dc487649aa89   k8s-worker-02   429495459328   Claimed      Active   5m10s
blockdevice-f6e0f4dbee623276730cb30884f0acd0   k8s-worker-03   429495459328   Claimed      Active   5m4s
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get cspc -n openebs-system
NAME            HEALTHYINSTANCES   PROVISIONEDINSTANCES   DESIREDINSTANCES   AGE
cstor-storage   3                  3                      3                  3m
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get cspi -n openebs-system
NAME                 HOSTNAME        FREE   CAPACITY     READONLY   PROVISIONEDREPLICAS   HEALTHYREPLICAS   STATUS   AGE
cstor-storage-gtkq   k8s-worker-01   386G   386000230k   false      0                     0                 ONLINE   3m3s
cstor-storage-n4gz   k8s-worker-03   386G   386000230k   false      0                     0                 ONLINE   3m2s
cstor-storage-xdcl   k8s-worker-02   386G   386000056k   false      0                     0                 ONLINE   3m3s
```

Now that we have the cStor storage pool online we can create a cStor `StorageClass` that references it.

```
adminuser@k8s-controller-01:~$ cat cstor-csi-sc.yaml
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cstor-csi-storage
provisioner: cstor.csi.openebs.io
allowVolumeExpansion: true
parameters:
  cas-type: cstor
  cstorPoolCluster: cstor-storage
  replicaCount: "3"
```
```
adminuser@k8s-controller-01:~$ sudo kubectl apply -f cstor-csi-sc.yaml
storageclass.storage.k8s.io/cstor-csi-storage created
```

With both the cStor storage pool and storage class configured, we can now finally create a volume that can be used by an application.

```
adminuser@k8s-controller-01:~$ cat demo-pvc.yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: demo-cstor-vol
  namespace: default
spec:
  storageClassName: cstor-csi-storage
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```
```
adminuser@k8s-controller-01:~$ sudo kubectl apply -f demo-pvc.yaml
persistentvolumeclaim/demo-cstor-vol created
```

We can now see that the volume has been created as specified.

```
adminuser@k8s-controller-01:~$ sudo kubectl get pvc
NAME             STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS        AGE
demo-cstor-vol   Bound    pvc-42d8c3f8-0552-4330-9d8c-009a6b907fd7   5Gi        RWO            cstor-csi-storage   77s
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get cstorvolumeconfig -n openebs-system
NAME                                       CAPACITY   STATUS   AGE
pvc-42d8c3f8-0552-4330-9d8c-009a6b907fd7   5Gi        Bound    100s
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get cstorvolume -n openebs-system
NAME                                       CAPACITY   STATUS    AGE
pvc-42d8c3f8-0552-4330-9d8c-009a6b907fd7   5Gi        Healthy   117s
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get cstorvolumereplica -n openebs-system
NAME                                                          ALLOCATED   USED   STATUS    AGE
pvc-42d8c3f8-0552-4330-9d8c-009a6b907fd7-cstor-storage-gtkq   6K          6K     Healthy   2m23s
pvc-42d8c3f8-0552-4330-9d8c-009a6b907fd7-cstor-storage-n4gz   6K          6K     Healthy   2m23s
pvc-42d8c3f8-0552-4330-9d8c-009a6b907fd7-cstor-storage-xdcl   6K          6K     Healthy   2m23s
```

We can also see that this is now reflected in the cStor storage pool as indicated by the change in replicas.

```
adminuser@k8s-controller-01:~$ sudo kubectl get cstorpoolinstance -n openebs-system
NAME                 HOSTNAME        FREE   CAPACITY     READONLY   PROVISIONEDREPLICAS   HEALTHYREPLICAS   STATUS   AGE
cstor-storage-gtkq   k8s-worker-01   386G   386000120k   false      1                     1                 ONLINE   21m
cstor-storage-n4gz   k8s-worker-03   386G   386000120k   false      1                     1                 ONLINE   21m
cstor-storage-xdcl   k8s-worker-02   386G   386000119k   false      1                     1                 ONLINE   21m
```

Now we will create a test pod that will mount the new volume and write to it.

```
adminuser@k8s-controller-01:~$ cat demo-app.yaml
---
apiVersion: v1
kind: Pod
metadata:
  name: busybox
  namespace: default
spec:
  containers:
  - command:
       - sh
       - -c
       - 'date >> /mnt/openebs-csi/date.txt; hostname >> /mnt/openebs-csi/hostname.txt; sync; sleep 5; sync; tail -f /dev/null;'
    image: busybox
    imagePullPolicy: Always
    name: busybox
    volumeMounts:
    - mountPath: /mnt/openebs-csi
      name: demo-vol
  volumes:
  - name: demo-vol
    persistentVolumeClaim:
      claimName: demo-cstor-vol
```
```
adminuser@k8s-controller-01:~$ sudo kubectl apply -f demo-app.yaml
pod/busybox created
```

Once provisioned, we can confirm that the volume is mounted and contains the date.

```
adminuser@k8s-controller-01:~$ sudo kubectl exec -n default -it busybox -- cat /mnt/openebs-csi/date.txt
Mon Jun 13 21:02:57 UTC 2022
```

We have now successfully tested OpenEBS. Now we can install it properly in the Kubernetes cluster using GitOps.

---

## Installation

Now that we have tested OpenEBS, to properly install it we simply just need to automate the manual steps we took above. Starting with the `iscsi` requirements, we use Ansible to install this on the appropriate nodes.

[ansible/roles/kubernetes_worker/tasks/iscsi.yml][ansible-roles-kubernetes-worker-tasks-iscsi-yml]
```
{%- raw %}
---
- name: iscsi | install iscsi package
  ansible.builtin.package:
    pkg: '{{ iscsi_package }}'
    state: present
  tags:
    - kubernetes
    - kubernetes-common
    - iscsi
  when: ansible_facts['os_family'] == 'Debian'

- name: iscsi | start and enable {{ iscsi_service_name }} service
  ansible.builtin.service:
    name: '{{ iscsi_service_name }}'
    state: started
    enabled: true
  tags:
    - kubernetes
    - kubernetes-common
    - iscsi
  when: ansible_facts['os_family'] == 'Debian'{% endraw %}
```

To ensure that the required disks are correctly provisioned, I updated the Terraform module that I created for provisioning KVM virtual machines to support adding additional disks. I've also since published [the module][terraform-libvirt-module-github] onto the [Terraform Registry][terraform-libvirt-module-registry].

<div class="blog_post_output hidden">
<p>(Click to show/hide the Terraform output)</p>
<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>(homelab) [user@workstation kubernetes]$ terraform1.1 apply
random_password.k8s-worker-03: Refreshing state... [id=none]
random_password.k8s-worker-01: Refreshing state... [id=none]
random_password.k8s-controller-01: Refreshing state... [id=none]
random_password.k8s-controller-02: Refreshing state... [id=none]
random_password.k8s-worker-02: Refreshing state... [id=none]
random_password.k8s-controller-03: Refreshing state... [id=none]
module.k8s-controller-02.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-02.lab.alexgardner.id.au.qcow2]
module.k8s-controller-02.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-02.lab.alexgardner.id.au-cloudinit.iso;d4e44816-8832-4b14-8dd0-f53bed911893]
module.k8s-worker-02.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-02.lab.alexgardner.id.au-cloudinit.iso;056f2f60-b6b3-4671-9351-3e236386d22e]
module.k8s-worker-02.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-02.lab.alexgardner.id.au.qcow2]
module.k8s-worker-01.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-01.lab.alexgardner.id.au.qcow2]
module.k8s-controller-01.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-01.lab.alexgardner.id.au-cloudinit.iso;e6cf0d8c-d35c-494d-8f66-161a185c96aa]
module.k8s-worker-01.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-01.lab.alexgardner.id.au-cloudinit.iso;15013e0c-86b8-4666-a58c-e9bcf55f5dbd]
module.k8s-controller-01.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-01.lab.alexgardner.id.au.qcow2]
module.k8s-controller-03.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-03.lab.alexgardner.id.au-cloudinit.iso;849748e3-8a06-412b-bd56-3c0ec54005f2]
module.k8s-worker-03.libvirt_cloudinit_disk.cloudinit: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-03.lab.alexgardner.id.au-cloudinit.iso;d6e29316-63ad-4d17-a103-daf5f3b21779]
module.k8s-worker-03.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-worker-03.lab.alexgardner.id.au.qcow2]
module.k8s-controller-03.libvirt_volume.main: Refreshing state... [id=/var/lib/libvirt/images/k8s-controller-03.lab.alexgardner.id.au.qcow2]
module.k8s-controller-02.libvirt_domain.main: Refreshing state... [id=a539a116-86ea-497a-b749-a43f972dcc31]
module.k8s-worker-02.libvirt_domain.main: Refreshing state... [id=c40c739e-fbe5-42e2-90f3-5b216d3be314]
module.k8s-controller-01.libvirt_domain.main: Refreshing state... [id=1892fac3-beca-4f58-bc35-a965b55574b5]
module.k8s-worker-01.libvirt_domain.main: Refreshing state... [id=1eac9c24-cb5c-4b7a-baae-2c24508ac098]
module.k8s-controller-03.libvirt_domain.main: Refreshing state... [id=7df9c8b0-3353-4c6b-b5ba-90f05e5eb15e]
module.k8s-worker-03.libvirt_domain.main: Refreshing state... [id=2d3cc009-04d1-48d7-a363-fdab2ad47492]

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create
-/+ destroy and then create replacement

Terraform will perform the following actions:

  # module.k8s-worker-01.libvirt_domain.main must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [ # forces replacement
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ wwn          = "" -> null
                # (1 unchanged element hidden)
            } # forces replacement,
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "1eac9c24-cb5c-4b7a-baae-2c24508ac098" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-worker-01.lab.alexgardner.id.au"
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
          ~ mac            = "52:54:00:A2:53:47" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-worker-01.libvirt_volume.additional_disks["openebs"] will be created
  + resource "libvirt_volume" "additional_disks" {
      + format = (known after apply)
      + id     = (known after apply)
      + name   = "k8s-worker-01.lab.alexgardner.id.au-openebs.qcow2"
      + pool   = "default"
      + size   = 429496524800
    }

  # module.k8s-worker-02.libvirt_domain.main must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [ # forces replacement
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ wwn          = "" -> null
                # (1 unchanged element hidden)
            } # forces replacement,
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "c40c739e-fbe5-42e2-90f3-5b216d3be314" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-worker-02.lab.alexgardner.id.au"
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
          ~ mac            = "52:54:00:2A:FA:68" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-worker-02.libvirt_volume.additional_disks["openebs"] will be created
  + resource "libvirt_volume" "additional_disks" {
      + format = (known after apply)
      + id     = (known after apply)
      + name   = "k8s-worker-02.lab.alexgardner.id.au-openebs.qcow2"
      + pool   = "default"
      + size   = 429496524800
    }

  # module.k8s-worker-03.libvirt_domain.main must be replaced
-/+ resource "libvirt_domain" "main" {
      ~ arch        = "x86_64" -> (known after apply)
      - cmdline     = [] -> null
      ~ disk        = [ # forces replacement
          ~ {
              ~ block_device = "" -> null
              ~ file         = "" -> null
              ~ scsi         = false -> null
              ~ url          = "" -> null
              ~ wwn          = "" -> null
                # (1 unchanged element hidden)
            } # forces replacement,
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      ~ emulator    = "/usr/bin/qemu-system-x86_64" -> (known after apply)
      ~ id          = "2d3cc009-04d1-48d7-a363-fdab2ad47492" -> (known after apply)
      ~ machine     = "pc" -> (known after apply)
        name        = "k8s-worker-03.lab.alexgardner.id.au"
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
          ~ mac            = "52:54:00:DE:AB:B7" -> (known after apply)
          + network_id     = (known after apply)
          + network_name   = (known after apply)
          - wait_for_lease = false -> null
            # (2 unchanged attributes hidden)
        }
    }

  # module.k8s-worker-03.libvirt_volume.additional_disks["openebs"] will be created
  + resource "libvirt_volume" "additional_disks" {
      + format = (known after apply)
      + id     = (known after apply)
      + name   = "k8s-worker-03.lab.alexgardner.id.au-openebs.qcow2"
      + pool   = "default"
      + size   = 429496524800
    }

Plan: 6 to add, 0 to change, 3 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

module.k8s-worker-02.libvirt_domain.main: Destroying... [id=c40c739e-fbe5-42e2-90f3-5b216d3be314]
module.k8s-worker-01.libvirt_domain.main: Destroying... [id=1eac9c24-cb5c-4b7a-baae-2c24508ac098]
module.k8s-worker-03.libvirt_domain.main: Destroying... [id=2d3cc009-04d1-48d7-a363-fdab2ad47492]
module.k8s-worker-02.libvirt_domain.main: Destruction complete after 0s
module.k8s-worker-02.libvirt_volume.additional_disks["openebs"]: Creating...
module.k8s-worker-01.libvirt_domain.main: Destruction complete after 0s
module.k8s-worker-03.libvirt_domain.main: Destruction complete after 0s
module.k8s-worker-01.libvirt_volume.additional_disks["openebs"]: Creating...
module.k8s-worker-03.libvirt_volume.additional_disks["openebs"]: Creating...
module.k8s-worker-02.libvirt_volume.additional_disks["openebs"]: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-02.lab.alexgardner.id.au-openebs.qcow2]
module.k8s-worker-01.libvirt_volume.additional_disks["openebs"]: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-01.lab.alexgardner.id.au-openebs.qcow2]
module.k8s-worker-03.libvirt_volume.additional_disks["openebs"]: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-03.lab.alexgardner.id.au-openebs.qcow2]
module.k8s-worker-02.libvirt_domain.main: Creating...
module.k8s-worker-01.libvirt_domain.main: Creating...
module.k8s-worker-03.libvirt_domain.main: Creating...
module.k8s-worker-02.libvirt_domain.main: Creation complete after 1s [id=c6a705f4-d328-42f0-b68e-3e8e617797e8]
module.k8s-worker-03.libvirt_domain.main: Creation complete after 1s [id=99c02d97-beba-4a19-afa3-773dd0e486c7]
module.k8s-worker-01.libvirt_domain.main: Creation complete after 1s [id=c29cf44e-b518-4bcc-89da-e191813ec82f]

Apply complete! Resources: 6 added, 0 changed, 3 destroyed.
</code></pre></div></div>
</div>

With the requirements now sorted, we can now install the OpenEBS Helm chart using ArgoCD. The new ArgoCD files we have created are:

1. [kubernetes/core/openebs/Chart.yaml][kubernetes-core-openebs-Chart-yaml]
1. [kubernetes/core/openebs/values.yaml][kubernetes-core-openebs-values-yaml]
1. [kubernetes/core/openebs/application-config.json][kubernetes-core-openebs-application-config-json]

Once these are committed to git, we can confirm that ArgoCD has deployed the new app.

```
adminuser@k8s-controller-01:~$ sudo kubectl config set-context --current --namespace=argocd-system
adminuser@k8s-controller-01:~$ sudo argocd app get openebs --core
Name:               openebs
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          openebs-system
URL:                http://localhost:39455/applications/openebs
Repo:               https://github.com/eyulf/homelab.git
Target:             main
Path:               kubernetes/core/openebs
Helm Values:        values.yaml
SyncWindow:         Sync Allowed
Sync Policy:        Automated
Sync Status:        Synced to main (bbe0ab1)
Health Status:      Healthy

GROUP                      KIND                      NAMESPACE       NAME                                            STATUS   HEALTH   HOOK  MESSAGE
                           ServiceAccount            openebs-system  openebs                                         Synced                  serviceaccount/openebs unchanged
                           ServiceAccount            openebs-system  openebs-cstor-csi-controller-sa                 Synced                  serviceaccount/openebs-cstor-csi-controller-sa unchanged
                           ServiceAccount            openebs-system  openebs-cstor-operator                          Synced                  serviceaccount/openebs-cstor-operator unchanged
                           ServiceAccount            openebs-system  openebs-cstor-csi-node-sa                       Synced                  serviceaccount/openebs-cstor-csi-node-sa unchanged
                           ConfigMap                 openebs-system  openebs-ndm-config                              Synced                  configmap/openebs-ndm-config unchanged
                           ConfigMap                 openebs-system  openebs-cstor-csi-iscsiadm                      Synced                  configmap/openebs-cstor-csi-iscsiadm unchanged
storage.k8s.io             StorageClass              openebs-system  openebs-device                                  Running  Synced         storageclass.storage.k8s.io/openebs-device unchanged
storage.k8s.io             StorageClass              openebs-system  openebs-hostpath                                Running  Synced         storageclass.storage.k8s.io/openebs-hostpath unchanged
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorcompletedbackups.cstor.openebs.io          Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorcompletedbackups.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  migrationtasks.openebs.io                       Running  Synced         customresourcedefinition.apiextensions.k8s.io/migrationtasks.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  blockdevices.openebs.io                         Running  Synced         customresourcedefinition.apiextensions.k8s.io/blockdevices.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorvolumereplicas.cstor.openebs.io            Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorvolumereplicas.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  blockdeviceclaims.openebs.io                    Running  Synced         customresourcedefinition.apiextensions.k8s.io/blockdeviceclaims.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorvolumeattachments.cstor.openebs.io         Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorvolumeattachments.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorvolumepolicies.cstor.openebs.io            Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorvolumepolicies.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorbackups.cstor.openebs.io                   Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorbackups.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  upgradetasks.openebs.io                         Running  Synced         customresourcedefinition.apiextensions.k8s.io/upgradetasks.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorvolumes.cstor.openebs.io                   Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorvolumes.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  volumesnapshotclasses.snapshot.storage.k8s.io   Running  Synced         customresourcedefinition.apiextensions.k8s.io/volumesnapshotclasses.snapshot.storage.k8s.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorpoolinstances.cstor.openebs.io             Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorpoolinstances.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorrestores.cstor.openebs.io                  Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorrestores.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorpoolclusters.cstor.openebs.io              Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorpoolclusters.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  cstorvolumeconfigs.cstor.openebs.io             Running  Synced         customresourcedefinition.apiextensions.k8s.io/cstorvolumeconfigs.cstor.openebs.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  volumesnapshotcontents.snapshot.storage.k8s.io  Running  Synced         customresourcedefinition.apiextensions.k8s.io/volumesnapshotcontents.snapshot.storage.k8s.io configured
apiextensions.k8s.io       CustomResourceDefinition  openebs-system  volumesnapshots.snapshot.storage.k8s.io         Running  Synced         customresourcedefinition.apiextensions.k8s.io/volumesnapshots.snapshot.storage.k8s.io configured
rbac.authorization.k8s.io  ClusterRole               openebs-system  openebs-cstor-csi-attacher-role                 Running  Synced         clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-attacher-role reconciled. clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-attacher-role unchanged
rbac.authorization.k8s.io  ClusterRole               openebs-system  openebs                                         Running  Synced         clusterrole.rbac.authorization.k8s.io/openebs reconciled. clusterrole.rbac.authorization.k8s.io/openebs unchanged
rbac.authorization.k8s.io  ClusterRole               openebs-system  openebs-cstor-migration                         Running  Synced         clusterrole.rbac.authorization.k8s.io/openebs-cstor-migration reconciled. clusterrole.rbac.authorization.k8s.io/openebs-cstor-migration unchanged
rbac.authorization.k8s.io  ClusterRole               openebs-system  openebs-cstor-csi-cluster-registrar-role        Running  Synced         clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-cluster-registrar-role reconciled. clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-cluster-registrar-role unchanged
rbac.authorization.k8s.io  ClusterRole               openebs-system  openebs-cstor-csi-provisioner-role              Running  Synced         clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-provisioner-role reconciled. clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-provisioner-role unchanged
rbac.authorization.k8s.io  ClusterRole               openebs-system  openebs-cstor-csi-snapshotter-role              Running  Synced         clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-snapshotter-role reconciled. clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-snapshotter-role unchanged
rbac.authorization.k8s.io  ClusterRole               openebs-system  openebs-cstor-operator                          Running  Synced         clusterrole.rbac.authorization.k8s.io/openebs-cstor-operator reconciled. clusterrole.rbac.authorization.k8s.io/openebs-cstor-operator unchanged
rbac.authorization.k8s.io  ClusterRole               openebs-system  openebs-cstor-csi-registrar-role                Running  Synced         clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-registrar-role reconciled. clusterrole.rbac.authorization.k8s.io/openebs-cstor-csi-registrar-role unchanged
rbac.authorization.k8s.io  ClusterRoleBinding        openebs-system  openebs                                         Running  Synced         clusterrolebinding.rbac.authorization.k8s.io/openebs reconciled. clusterrolebinding.rbac.authorization.k8s.io/openebs unchanged
rbac.authorization.k8s.io  ClusterRoleBinding        openebs-system  openebs-cstor-csi-attacher-binding              Running  Synced         clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-attacher-binding reconciled. clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-attacher-binding unchanged
rbac.authorization.k8s.io  ClusterRoleBinding        openebs-system  openebs-cstor-csi-registrar-binding             Running  Synced         clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-registrar-binding reconciled. clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-registrar-binding unchanged
rbac.authorization.k8s.io  ClusterRoleBinding        openebs-system  openebs-cstor-csi-cluster-registrar-binding     Running  Synced         clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-cluster-registrar-binding reconciled. clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-cluster-registrar-binding unchanged
rbac.authorization.k8s.io  ClusterRoleBinding        openebs-system  openebs-cstor-csi-snapshotter-binding           Running  Synced         clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-snapshotter-binding reconciled. clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-snapshotter-binding unchanged
rbac.authorization.k8s.io  ClusterRoleBinding        openebs-system  openebs-cstor-operator                          Running  Synced         clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-operator reconciled. clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-operator unchanged
rbac.authorization.k8s.io  ClusterRoleBinding        openebs-system  openebs-cstor-csi-provisioner-binding           Running  Synced         clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-provisioner-binding reconciled. clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-csi-provisioner-binding unchanged
rbac.authorization.k8s.io  ClusterRoleBinding        openebs-system  openebs-cstor-migration                         Running  Synced         clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-migration reconciled. clusterrolebinding.rbac.authorization.k8s.io/openebs-cstor-migration unchanged
                           Service                   openebs-system  openebs-cstor-cvc-operator-svc                  Synced   Healthy        service/openebs-cstor-cvc-operator-svc unchanged
apps                       DaemonSet                 openebs-system  openebs-ndm                                     Synced   Healthy        daemonset.apps/openebs-ndm unchanged
apps                       DaemonSet                 openebs-system  openebs-cstor-csi-node                          Synced   Healthy        daemonset.apps/openebs-cstor-csi-node unchanged
apps                       Deployment                openebs-system  openebs-localpv-provisioner                     Synced   Healthy        deployment.apps/openebs-localpv-provisioner configured
apps                       Deployment                openebs-system  openebs-cstor-cvc-operator                      Synced   Healthy        deployment.apps/openebs-cstor-cvc-operator configured
apps                       Deployment                openebs-system  openebs-cstor-admission-server                  Synced   Healthy        deployment.apps/openebs-cstor-admission-server configured
apps                       Deployment                openebs-system  openebs-cstor-cspc-operator                     Synced   Healthy        deployment.apps/openebs-cstor-cspc-operator configured
apps                       Deployment                openebs-system  openebs-ndm-operator                            Synced   Healthy        deployment.apps/openebs-ndm-operator configured
apps                       StatefulSet               openebs-system  openebs-cstor-csi-controller                    Synced   Healthy        statefulset.apps/openebs-cstor-csi-controller configured
snapshot.storage.k8s.io    VolumeSnapshotClass       openebs-system  csi-cstor-snapshotclass                         Running  Synced         volumesnapshotclass.snapshot.storage.k8s.io/csi-cstor-snapshotclass created
storage.k8s.io             CSIDriver                 openebs-system  cstor.csi.openebs.io                            Running  Synced         csidriver.storage.k8s.io/cstor.csi.openebs.io unchanged
scheduling.k8s.io          PriorityClass             openebs-system  openebs-cstor-csi-controller-critical           Running  Synced         priorityclass.scheduling.k8s.io/openebs-cstor-csi-controller-critical configured
scheduling.k8s.io          PriorityClass             openebs-system  openebs-cstor-csi-node-critical                 Running  Synced         priorityclass.scheduling.k8s.io/openebs-cstor-csi-node-critical configured
apiextensions.k8s.io       CustomResourceDefinition                  blockdeviceclaims.openebs.io                    Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  blockdevices.openebs.io                         Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorbackups.cstor.openebs.io                   Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorcompletedbackups.cstor.openebs.io          Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorpoolclusters.cstor.openebs.io              Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorpoolinstances.cstor.openebs.io             Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorrestores.cstor.openebs.io                  Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorvolumeattachments.cstor.openebs.io         Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorvolumeconfigs.cstor.openebs.io             Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorvolumepolicies.cstor.openebs.io            Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorvolumereplicas.cstor.openebs.io            Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  cstorvolumes.cstor.openebs.io                   Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  migrationtasks.openebs.io                       Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  upgradetasks.openebs.io                         Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  volumesnapshotclasses.snapshot.storage.k8s.io   Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  volumesnapshotcontents.snapshot.storage.k8s.io  Synced                  
apiextensions.k8s.io       CustomResourceDefinition                  volumesnapshots.snapshot.storage.k8s.io         Synced                  
rbac.authorization.k8s.io  ClusterRole                               openebs                                         Synced                  
rbac.authorization.k8s.io  ClusterRole                               openebs-cstor-csi-attacher-role                 Synced                  
rbac.authorization.k8s.io  ClusterRole                               openebs-cstor-csi-cluster-registrar-role        Synced                  
rbac.authorization.k8s.io  ClusterRole                               openebs-cstor-csi-provisioner-role              Synced                  
rbac.authorization.k8s.io  ClusterRole                               openebs-cstor-csi-registrar-role                Synced                  
rbac.authorization.k8s.io  ClusterRole                               openebs-cstor-csi-snapshotter-role              Synced                  
rbac.authorization.k8s.io  ClusterRole                               openebs-cstor-migration                         Synced                  
rbac.authorization.k8s.io  ClusterRole                               openebs-cstor-operator                          Synced                  
rbac.authorization.k8s.io  ClusterRoleBinding                        openebs                                         Synced                  
rbac.authorization.k8s.io  ClusterRoleBinding                        openebs-cstor-csi-attacher-binding              Synced                  
rbac.authorization.k8s.io  ClusterRoleBinding                        openebs-cstor-csi-cluster-registrar-binding     Synced                  
rbac.authorization.k8s.io  ClusterRoleBinding                        openebs-cstor-csi-provisioner-binding           Synced                  
rbac.authorization.k8s.io  ClusterRoleBinding                        openebs-cstor-csi-registrar-binding             Synced                  
rbac.authorization.k8s.io  ClusterRoleBinding                        openebs-cstor-csi-snapshotter-binding           Synced                  
rbac.authorization.k8s.io  ClusterRoleBinding                        openebs-cstor-migration                         Synced                  
rbac.authorization.k8s.io  ClusterRoleBinding                        openebs-cstor-operator                          Synced                  
scheduling.k8s.io          PriorityClass                             openebs-cstor-csi-controller-critical           Synced                  
scheduling.k8s.io          PriorityClass                             openebs-cstor-csi-node-critical                 Synced                  
snapshot.storage.k8s.io    VolumeSnapshotClass                       csi-cstor-snapshotclass                         Synced                  
storage.k8s.io             CSIDriver                                 cstor.csi.openebs.io                            Synced                  
storage.k8s.io             StorageClass                              openebs-device                                  Synced                  
storage.k8s.io             StorageClass                              openebs-hostpath                                Synced                  
```

We can also confirm that the new namespace exists in Kubernetes with the expected resources.

```
adminuser@k8s-controller-01:~$ sudo kubectl get all -n openebs-system
NAME                                                 READY   STATUS    RESTARTS   AGE
pod/cstor-stripe-4vr8-7889ddbb89-ct7gc               3/3     Running   0          12m
pod/cstor-stripe-9wnc-7ff8c8f6cf-tlqrb               3/3     Running   0          12m
pod/cstor-stripe-ng6g-6fd77749cb-kb7s2               3/3     Running   0          12m
pod/openebs-cstor-admission-server-f6dbf8688-trbdp   1/1     Running   0          14m
pod/openebs-cstor-csi-controller-0                   6/6     Running   0          14m
pod/openebs-cstor-csi-node-crc2s                     2/2     Running   0          14m
pod/openebs-cstor-csi-node-hfp2r                     2/2     Running   0          14m
pod/openebs-cstor-csi-node-wv5gh                     2/2     Running   0          14m
pod/openebs-cstor-cspc-operator-5876fd8c-7f4rk       1/1     Running   0          14m
pod/openebs-cstor-cvc-operator-6595649458-k9m4k      1/1     Running   0          14m
pod/openebs-localpv-provisioner-75457dc575-7nb94     1/1     Running   0          14m
pod/openebs-ndm-6p79f                                1/1     Running   0          14m
pod/openebs-ndm-n4jrr                                1/1     Running   0          14m
pod/openebs-ndm-operator-74dcc95548-48mcg            1/1     Running   0          14m
pod/openebs-ndm-vgfvg                                1/1     Running   0          14m

NAME                                     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/openebs-cstor-admission-server   ClusterIP   10.110.145.76   <none>        443/TCP    13m
service/openebs-cstor-cvc-operator-svc   ClusterIP   10.111.203.31   <none>        5757/TCP   14m

NAME                                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.apps/openebs-cstor-csi-node   3         3         3       3            3           <none>          14m
daemonset.apps/openebs-ndm              3         3         3       3            3           <none>          14m

NAME                                             READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/cstor-stripe-4vr8                1/1     1            1           12m
deployment.apps/cstor-stripe-9wnc                1/1     1            1           12m
deployment.apps/cstor-stripe-ng6g                1/1     1            1           12m
deployment.apps/openebs-cstor-admission-server   1/1     1            1           14m
deployment.apps/openebs-cstor-cspc-operator      1/1     1            1           14m
deployment.apps/openebs-cstor-cvc-operator       1/1     1            1           14m
deployment.apps/openebs-localpv-provisioner      1/1     1            1           14m
deployment.apps/openebs-ndm-operator             1/1     1            1           14m

NAME                                                       DESIRED   CURRENT   READY   AGE
replicaset.apps/cstor-stripe-4vr8-7889ddbb89               1         1         1       12m
replicaset.apps/cstor-stripe-9wnc-7ff8c8f6cf               1         1         1       12m
replicaset.apps/cstor-stripe-ng6g-6fd77749cb               1         1         1       12m
replicaset.apps/openebs-cstor-admission-server-f6dbf8688   1         1         1       14m
replicaset.apps/openebs-cstor-cspc-operator-5876fd8c       1         1         1       14m
replicaset.apps/openebs-cstor-cvc-operator-6595649458      1         1         1       14m
replicaset.apps/openebs-localpv-provisioner-75457dc575     1         1         1       14m
replicaset.apps/openebs-ndm-operator-74dcc95548            1         1         1       14m

NAME                                            READY   AGE
statefulset.apps/openebs-cstor-csi-controller   1/1     14m
```

## Configuration

I was unable to use ArgoCD to dynamically create the `CStorPoolCluster` resource using [Helm templates][helm-template]. In order to dynamically source the required `blockdevices` names you need to use the [`lookup` function][helm-template-lookup] in the Helm template. As noted in the Helm documentation, Helm will return an empty variable when `lookup` is used in a template when running the `helm template` command. As per the [ArgoCD documentation][argocd-helm-documentation], ArgoCD makes use of the `helm template` command when checking if resources are in sync. It is not well documented in the official documentation, but ArgoCD also uses `helm template` when syncing/creating resources. As such, ArgoCD simply does not work with the Helm `lookup` template function, there is an open [GitHub issue][argocd-github-issue] on this.

The [workarounds suggested by devs][argocd-github-issue-workaround] is to either add a service account for ArgoCD and mount the token or to create a wrapper script around the `helm` binary. From an automation and operational standpoint, I do not feel that these are suitable workarounds.

My workaround to this was to move the storage cluster configuration out of ArgoCD completely. I have instead added this as part of the Ansible based bootstrapping configuration. This works by creating an Ansible variable that contains the Kubernetes blockdevices configuration and then using this to populate a template for the `CStorPoolCluster` yaml file.

1. [ansible/roles/kubernetes_bootstrap/tasks/core.yml][ansible-roles-kubernetes-bootstrap-tasks-core-yml]
1. [ansible/roles/kubernetes_bootstrap/templates/opt/homelab/kubernetes/core/openebs/ansible/cstor-pool-cluster.yaml.j2][ansible-roles-kubernetes-bootstrap-templates-opt-homelab-kubernetes-core-openebs-ansible-cstor-pool-cluster-yaml-j2]
1. [ansible/roles/kubernetes_bootstrap/files/opt/homelab/kubernetes/core/openebs/ansible/cstor-storage-class.yaml][ansible-roles-kubernetes-bootstrap-files-opt-homelab-kubernetes-core-openebs-ansible-cstor-storage-class-yaml]
1. [ansible/roles/kubernetes_bootstrap/handlers/main.yml][ansible-roles-kubernetes-bootstrap-handlers-main-yml]

The handlers that are notified simply apply the configuration and pause to allow the storage cluster to fully provision.

While this does deviate from the GitOps process, in this specific case the benefits outweigh the drawbacks to do so. The storage pool configuration should not need to be modified after provisioning and including this in the Ansible bootstrap means that when rebuilding the cluster using my [rebuild script][rebuild-k8s-sh] the blockdevices are configured as part of it.

With more effort, I may be able to find a more elegant way around this issue that fully uses GitOps, however, for now the current workaround works without needing to make wrapper scripts.

## Usage

With OpenEBS installed, configured with cStor, we can now make use of it. To do so we need to create a `PersistentVolumeClaim` for the application in question and then configure the application to use it.

The way to do this depends on the application itself. The PiHole Helm chart has support for creating a PersistentVolumeClaim. To use this we simply need to add the following to the [values.yaml][kubernetes-apps-pihole-values-yaml] file.

```
  persistentVolumeClaim:
    enabled: true
    storageClass: cstor-stripe
```

With this committed, the application has a volume it can make use of. In this instance I tested it by making some changes to blacklist settings in the PiHole GUI and confirming they persisted after deleting the active PiHole pod.

```
adminuser@k8s-controller-01:~$ sudo kubectl get cstorvolumeconfig -n openebs-system
NAME                                       CAPACITY   STATUS   AGE
pvc-0a95022b-b3fa-4b02-9142-cd737774890f   1Gi        Bound    10m
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get cstorvolume -n openebs-system
NAME                                       CAPACITY   STATUS    AGE
pvc-0a95022b-b3fa-4b02-9142-cd737774890f   1Gi        Healthy   10m
```
```
adminuser@k8s-controller-01:~$ sudo kubectl get cstorvolumereplica -n openebs-system
NAME                                                         ALLOCATED   USED    STATUS    AGE
pvc-0a95022b-b3fa-4b02-9142-cd737774890f-cstor-stripe-7kzm   9.19M       49.8M   Healthy   10m
pvc-0a95022b-b3fa-4b02-9142-cd737774890f-cstor-stripe-fvd9   9.23M       50.0M   Healthy   10m
pvc-0a95022b-b3fa-4b02-9142-cd737774890f-cstor-stripe-pxlh   9.26M       50.1M   Healthy   10m
```

## Next Steps

Now that we have cluster storage available, we can make more use of applications that require it. However, now that we have persistent storage, we also need to back up the data. Also, to allow the cluster to be re-provisioned at will the data backups need to be automatically restored during cluster bootstrapping.


[homelab-refresh-k8s-traefik]: {% link _posts/2022-04-24-home-lab-refresh-kubernetes-traefik.md %}

[k8s-storage-volumes]:       https://kubernetes.io/docs/concepts/storage/volumes/
[kubevious-blog-post]:       https://kubevious.io/blog/post/comparing-top-storage-solutions-for-kubernetes
[platform9-blog-post]:       https://platform9.com/blog/top-storage-solutions-for-kubernetes/
[rajputvaibhav-medium-post]: https://rajputvaibhav.medium.com/battle-of-bytes-comparing-kubernetes-storage-solutions-583aa53ddd16
[openebs]:                   https://openebs.io/
[openebs-cstor]:             https://openebs.io/docs/main/concepts/cstor
[openebs-cas]:               https://openebs.io/docs/main/concepts/cas
[openebs-cstor-guide]:       https://openebs.io/docs/user-guides/cstor

[terraform-libvirt-module-github]:   https://github.com/eyulf/terraform-module-libvirt-virtual-machine
[terraform-libvirt-module-registry]: https://registry.terraform.io/modules/eyulf/libvirt-virtual-machine/module/1.0.0
[helm-template]:                     https://helm.sh/docs/chart_template_guide/getting_started/
[helm-template-lookup]:              https://helm.sh/docs/chart_template_guide/functions_and_pipelines/#using-the-lookup-function
[argocd-helm-documentation]:         https://argo-cd.readthedocs.io/en/stable/user-guide/helm/#random-data
[argocd-github-issue]:               https://github.com/argoproj/argo-cd/issues/5202
[argocd-github-issue-workaround]:    https://github.com/argoproj/argo-cd/issues/5202#issuecomment-756406140

[ansible-roles-kubernetes-worker-tasks-iscsi-yml]: https://github.com/eyulf/homelab/blob/b569ca2a436434bdfc59336acd6b1508763f3631/ansible/roles/kubernetes_worker/tasks/iscsi.yml
[kubernetes-core-openebs-Chart-yaml]:              https://github.com/eyulf/homelab/blob/7875b5054094f47e67b2cc5d9e58e59ea882e225/kubernetes/core/openebs/Chart.yaml
[kubernetes-core-openebs-values-yaml]:             https://github.com/eyulf/homelab/blob/bbe0ab1de9cfd0764685913f920d39f6cad21dd5/kubernetes/core/openebs/values.yaml
[kubernetes-core-openebs-application-config-json]: https://github.com/eyulf/homelab/blob/e463125cd4e5169aa553bc42cf7d1f8bc0c4e965/kubernetes/core/openebs/application-config.json

[ansible-roles-kubernetes-bootstrap-tasks-core-yml]:    https://github.com/eyulf/homelab/blob/efd41c291d8f2c503bfb230ba31bdc7a5428cf9d/ansible/roles/kubernetes_bootstrap/tasks/core.yml
[ansible-roles-kubernetes-bootstrap-handlers-main-yml]: https://github.com/eyulf/homelab/blob/efd41c291d8f2c503bfb230ba31bdc7a5428cf9d/ansible/roles/kubernetes_bootstrap/handlers/main.yml

[ansible-roles-kubernetes-bootstrap-templates-opt-homelab-kubernetes-core-openebs-ansible-cstor-pool-cluster-yaml-j2]: https://github.com/eyulf/homelab/blob/efd41c291d8f2c503bfb230ba31bdc7a5428cf9d/ansible/roles/kubernetes_bootstrap/templates/opt/homelab/kubernetes/core/openebs/ansible/cstor-pool-cluster.yaml.j2
[ansible-roles-kubernetes-bootstrap-files-opt-homelab-kubernetes-core-openebs-ansible-cstor-storage-class-yaml]:       https://github.com/eyulf/homelab/blob/efd41c291d8f2c503bfb230ba31bdc7a5428cf9d/ansible/roles/kubernetes_bootstrap/files/opt/homelab/kubernetes/core/openebs/ansible/cstor-storage-class.yaml

[rebuild-k8s-sh]:                     https://github.com/eyulf/homelab/blob/efd41c291d8f2c503bfb230ba31bdc7a5428cf9d/rebuild-k8s.sh
[kubernetes-apps-pihole-values-yaml]: https://github.com/eyulf/homelab/blob/5568a30ebcba8a9c8c198283b49036b049b738a0/kubernetes/apps/pihole/values.yaml
