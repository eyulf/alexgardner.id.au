---
layout: post
title: "Home-Lab Refresh: Kubernetes Cluster Installation"
date: 2022-01-22 14:23 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-kubernetes-install
---

Following setting up [PowerDNS][homelab-refresh-dns] for my [Homelab Refresh][homelab-refresh], the next step was to create a Kubernetes cluster for running containers. While I could run containers directly on hosts using Docker, a Kubernetes cluster will allow me to use a [gitops workflow][gitops] to provision containers. This is preferable to alternatives such as deploying containers via Ansible and Terraform for the following reasons.

1. Better automation. A gitops workflow will deploy changes to containers once a change is made to the git repo compared to making the change and then manually running Ansible or Terraform commands.
1. Encrypted secrets can be decrypted and used for deploying changes, which provides secure version control for secrets.
1. Git _is_ the source of truth for what is running in the cluster.
1. Related to the last point, it is more reliable to revert a change if something breaks.
1. Confidence that I can take a backup of database data, blow away the cluster, create a new cluster, provision the containers from git, import the database data, and have no divergences from the state the cluster was in prior to it being blown away.

This is also a good chance to get some practical experience with Kubernetes, as learning new technology is the point of running a homelab after all.

Things to note with the cluster is that we are using Corosync and Pacemaker to provide a highly available floating IP that is used as the API endpoint. Additionally the PKI certificates are generated external to the cluster so that they can be distributed using Ansible without needing to provide SSH connectivity between hosts. Other then this, [kubeadm][kubeadm-install] is used to create the cluster and join the nodes.

Setting this up has a few steps:

1. [Terraform](#terraform)
1. [PKI](#pki)
1. [Ansible](#ansible)
1. [Kubernetes](#kubernetes)

This can be condensed to simply running the following commands.

```
cd terraform/infrastructure/kubernetes
terraform1.1 apply

cd ../../../k8s-pki
./pki-gen all

cd ../ansible
ansible-playbook -i production k8s-all.yml
```

## Terraform

The first step for deploying the Kubernetes servers is to provision them using Terraform. I've published the [Terraform configuration][terraform-commit] that I've used for deploying these servers.

### Variables
terraform/infrastructure/kubernetes/[terraform.tfvars][terraform-tfvars]
```
hypervisor_hosts = {
  "kvm1" = {
    "ip"   = "10.1.1.21",
    "user" = "root",
  },
  "kvm2" = {
    "ip"   = "10.1.1.22",
    "user" = "root",
  },
  "kvm3" = {
    "ip"   = "10.1.1.23",
    "user" = "root",
  },
}

virtual_machines = {
  "k8s-controller-01" = {
    "ip"   = "10.1.1.41",
    "os"   = "debian_10"
  },
  "k8s-controller-02" = {
    "ip"   = "10.1.1.42",
    "os"   = "debian_10"
  },
  "k8s-controller-03" = {
    "ip"   = "10.1.1.43",
    "os"   = "debian_10"
  },
  "k8s-worker-01" = {
    "ip"   = "10.1.1.51",
    "os"   = "debian_10"
  },
  "k8s-worker-02" = {
    "ip"   = "10.1.1.52",
    "os"   = "debian_10"
  },
  "k8s-worker-03" = {
    "ip"   = "10.1.1.53",
    "os"   = "debian_10"
  },
}

domain = "lab.alexgardner.id.au"

host_admin_users = {
  "adminuser" = "ssh-rsa AAAAB[...truncated...]NZe19",
}

network_gateway_ip     = "10.1.1.1"
network_nameserver_ips = "10.1.1.31, 10.1.1.32, 10.1.1.33"
```

### Commands
```
cd terraform/infrastructure/kubernetes
terraform1.1 apply
```

<div class="blog_post_output hidden">

<h3 id="output">Output</h3>
<p>(Click to show/hide the output)</p>
<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>[user@workstation kubernetes]$ terraform1.1 apply

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with
the following symbols:
  + create

Terraform will perform the following actions:

  # random_password.k8s-controller-01 will be created
  + resource "random_password" "k8s-controller-01" {
      + id          = (known after apply)
      + length      = 32
      + lower       = true
      + min_lower   = 0
      + min_numeric = 0
      + min_special = 0
      + min_upper   = 0
      + number      = true
      + result      = (sensitive value)
      + special     = false
      + upper       = true
    }

  # random_password.k8s-controller-02 will be created
  + resource "random_password" "k8s-controller-02" {
      + id          = (known after apply)
      + length      = 32
      + lower       = true
      + min_lower   = 0
      + min_numeric = 0
      + min_special = 0
      + min_upper   = 0
      + number      = true
      + result      = (sensitive value)
      + special     = false
      + upper       = true
    }

  # random_password.k8s-controller-03 will be created
  + resource "random_password" "k8s-controller-03" {
      + id          = (known after apply)
      + length      = 32
      + lower       = true
      + min_lower   = 0
      + min_numeric = 0
      + min_special = 0
      + min_upper   = 0
      + number      = true
      + result      = (sensitive value)
      + special     = false
      + upper       = true
    }

  # random_password.k8s-worker-01 will be created
  + resource "random_password" "k8s-worker-01" {
      + id          = (known after apply)
      + length      = 32
      + lower       = true
      + min_lower   = 0
      + min_numeric = 0
      + min_special = 0
      + min_upper   = 0
      + number      = true
      + result      = (sensitive value)
      + special     = false
      + upper       = true
    }

  # random_password.k8s-worker-02 will be created
  + resource "random_password" "k8s-worker-02" {
      + id          = (known after apply)
      + length      = 32
      + lower       = true
      + min_lower   = 0
      + min_numeric = 0
      + min_special = 0
      + min_upper   = 0
      + number      = true
      + result      = (sensitive value)
      + special     = false
      + upper       = true
    }

  # random_password.k8s-worker-03 will be created
  + resource "random_password" "k8s-worker-03" {
      + id          = (known after apply)
      + length      = 32
      + lower       = true
      + min_lower   = 0
      + min_numeric = 0
      + min_special = 0
      + min_upper   = 0
      + number      = true
      + result      = (sensitive value)
      + special     = false
      + upper       = true
    }

  # module.k8s-controller-01.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "k8s-controller-01.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.41/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.31, 10.1.1.32, 10.1.1.33 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.k8s-controller-01.libvirt_domain.main will be created
  + resource "libvirt_domain" "main" {
      + arch        = (known after apply)
      + autostart   = true
      + cloudinit   = (known after apply)
      + disk        = [
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "k8s-controller-01.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + bridge       = "br0"
          + hostname     = "k8s-controller-01.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.k8s-controller-01.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "k8s-controller-01.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

  # module.k8s-controller-02.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "k8s-controller-02.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.42/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.31, 10.1.1.32, 10.1.1.33 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.k8s-controller-02.libvirt_domain.main will be created
  + resource "libvirt_domain" "main" {
      + arch        = (known after apply)
      + autostart   = true
      + cloudinit   = (known after apply)
      + disk        = [
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "k8s-controller-02.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + bridge       = "br0"
          + hostname     = "k8s-controller-02.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.k8s-controller-02.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "k8s-controller-02.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

  # module.k8s-controller-03.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "k8s-controller-03.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.43/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.31, 10.1.1.32, 10.1.1.33 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.k8s-controller-03.libvirt_domain.main will be created
  + resource "libvirt_domain" "main" {
      + arch        = (known after apply)
      + autostart   = true
      + cloudinit   = (known after apply)
      + disk        = [
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "k8s-controller-03.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + bridge       = "br0"
          + hostname     = "k8s-controller-03.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.k8s-controller-03.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "k8s-controller-03.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

  # module.k8s-worker-01.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "k8s-worker-01.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.51/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.31, 10.1.1.32, 10.1.1.33 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.k8s-worker-01.libvirt_domain.main will be created
  + resource "libvirt_domain" "main" {
      + arch        = (known after apply)
      + autostart   = true
      + cloudinit   = (known after apply)
      + disk        = [
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "k8s-worker-01.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + bridge       = "br0"
          + hostname     = "k8s-worker-01.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.k8s-worker-01.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "k8s-worker-01.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

  # module.k8s-worker-02.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "k8s-worker-02.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.52/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.31, 10.1.1.32, 10.1.1.33 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.k8s-worker-02.libvirt_domain.main will be created
  + resource "libvirt_domain" "main" {
      + arch        = (known after apply)
      + autostart   = true
      + cloudinit   = (known after apply)
      + disk        = [
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "k8s-worker-02.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + bridge       = "br0"
          + hostname     = "k8s-worker-02.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.k8s-worker-02.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "k8s-worker-02.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

  # module.k8s-worker-03.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "k8s-worker-03.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.53/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.31, 10.1.1.32, 10.1.1.33 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.k8s-worker-03.libvirt_domain.main will be created
  + resource "libvirt_domain" "main" {
      + arch        = (known after apply)
      + autostart   = true
      + cloudinit   = (known after apply)
      + disk        = [
          + {
              + block_device = null
              + file         = null
              + scsi         = null
              + url          = null
              + volume_id    = (known after apply)
              + wwn          = null
            },
        ]
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "k8s-worker-03.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + bridge       = "br0"
          + hostname     = "k8s-worker-03.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.k8s-worker-03.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "k8s-worker-03.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

Plan: 24 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

random_password.k8s-worker-03: Creating...
random_password.k8s-controller-01: Creating...
random_password.k8s-controller-03: Creating...
random_password.k8s-worker-02: Creating...
random_password.k8s-worker-01: Creating...
random_password.k8s-controller-03: Creation complete after 0s [id=none]
random_password.k8s-controller-02: Creating...
random_password.k8s-controller-01: Creation complete after 0s [id=none]
random_password.k8s-controller-02: Creation complete after 0s [id=none]
random_password.k8s-worker-03: Creation complete after 0s [id=none]
random_password.k8s-worker-02: Creation complete after 0s [id=none]
random_password.k8s-worker-01: Creation complete after 0s [id=none]
module.k8s-worker-03.libvirt_volume.main: Creating...
module.k8s-controller-02.libvirt_volume.main: Creating...
module.k8s-worker-03.libvirt_cloudinit_disk.cloudinit: Creating...
module.k8s-controller-02.libvirt_cloudinit_disk.cloudinit: Creating...
module.k8s-worker-01.libvirt_volume.main: Creating...
module.k8s-controller-03.libvirt_volume.main: Creating...
module.k8s-worker-02.libvirt_volume.main: Creating...
module.k8s-worker-01.libvirt_cloudinit_disk.cloudinit: Creating...
module.k8s-controller-01.libvirt_cloudinit_disk.cloudinit: Creating...
module.k8s-controller-01.libvirt_volume.main: Creating...
module.k8s-worker-03.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-03.lab.alexgardner.id.au.qcow2]
module.k8s-controller-03.libvirt_cloudinit_disk.cloudinit: Creating...
module.k8s-controller-02.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-controller-02.lab.alexgardner.id.au.qcow2]
module.k8s-worker-02.libvirt_cloudinit_disk.cloudinit: Creating...
module.k8s-worker-01.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-01.lab.alexgardner.id.au.qcow2]
module.k8s-worker-03.libvirt_cloudinit_disk.cloudinit: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-03.lab.alexgardner.id.au-cloudinit.iso;255b1091-09db-4c72-aadb-3e841d3fb389]
module.k8s-worker-03.libvirt_domain.main: Creating...
module.k8s-controller-02.libvirt_cloudinit_disk.cloudinit: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-controller-02.lab.alexgardner.id.au-cloudinit.iso;0514ce11-4053-4d5a-9500-a482952b1b29]
module.k8s-controller-02.libvirt_domain.main: Creating...
module.k8s-controller-03.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-controller-03.lab.alexgardner.id.au.qcow2]
module.k8s-worker-02.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-02.lab.alexgardner.id.au.qcow2]
module.k8s-controller-01.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-controller-01.lab.alexgardner.id.au.qcow2]
module.k8s-worker-01.libvirt_cloudinit_disk.cloudinit: Creation complete after 0s [id=/var/lib/libvirt/images/k8s-worker-01.lab.alexgardner.id.au-cloudinit.iso;58c3f26a-6ae8-42ad-a35c-fdfee8f3d71a]
module.k8s-worker-01.libvirt_domain.main: Creating...
module.k8s-controller-01.libvirt_cloudinit_disk.cloudinit: Creation complete after 1s [id=/var/lib/libvirt/images/k8s-controller-01.lab.alexgardner.id.au-cloudinit.iso;f8b2fb63-1c3e-411a-8904-d00f622ef3da]
module.k8s-controller-01.libvirt_domain.main: Creating...
module.k8s-controller-03.libvirt_cloudinit_disk.cloudinit: Creation complete after 1s [id=/var/lib/libvirt/images/k8s-controller-03.lab.alexgardner.id.au-cloudinit.iso;834cef9e-4acb-4901-a68c-64f84917996d]
module.k8s-controller-03.libvirt_domain.main: Creating...
module.k8s-worker-02.libvirt_cloudinit_disk.cloudinit: Creation complete after 1s [id=/var/lib/libvirt/images/k8s-worker-02.lab.alexgardner.id.au-cloudinit.iso;8fc840c6-26d4-4676-800e-b6444f8ddde3]
module.k8s-worker-02.libvirt_domain.main: Creating...
module.k8s-controller-02.libvirt_domain.main: Creation complete after 2s [id=0935acf4-9369-4242-ae8e-d259951a612e]
module.k8s-worker-03.libvirt_domain.main: Creation complete after 2s [id=ea716172-7682-4d79-9ea9-2dba381e0232]
module.k8s-worker-02.libvirt_domain.main: Creation complete after 3s [id=d8aaa8c8-4ea6-4e28-9fb9-005aa33d3ac3]
module.k8s-worker-01.libvirt_domain.main: Creation complete after 4s [id=3c302255-c8bf-4f5d-b9ed-783537f358e6]
module.k8s-controller-03.libvirt_domain.main: Creation complete after 3s [id=daa8119a-82a2-4aec-980f-b5463edd5f09]
module.k8s-controller-01.libvirt_domain.main: Creation complete after 3s [id=ae895973-918b-47f1-bb2b-fd45766bfb42]

Apply complete! Resources: 24 added, 0 changed, 0 destroyed.
</code></pre></div></div>
</div>

## PKI

For this cluster I'm using external PKI certificates to prevent the Certificate Authority Private Keys needing to be stored on the nodes themselves. To make this easier, I wrote a [quick bash script][pki-commit] to generate all required SSL certificates, copy them into the relevant Ansible file directories, and then encrypt them to new files so they can be stored in git.

With this, generating the PKI certificates used by Kubernetes is as easy as running a single command. However, this is not idempotent so it will generate and copy new certificates each time it is run.

### Commands
```
cd k8s-pki
./pki-gen all
```

<div class="blog_post_output hidden">

<h3 id="output">Output</h3>
<p>(Click to show/hide the output)</p>
<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>[user@workstation k8s-pki]$ ./pki-gen all
2022/01/22 11:22:53 [INFO] generating a new CA key and certificate from CSR
2022/01/22 11:22:53 [INFO] generate received request
2022/01/22 11:22:53 [INFO] received CSR
2022/01/22 11:22:53 [INFO] generating key: rsa-2048
2022/01/22 11:22:53 [INFO] encoded CSR
2022/01/22 11:22:53 [INFO] signed certificate with serial number 146042152269269461038859111384441689340742448634
2022/01/22 11:22:53 [INFO] generating a new CA key and certificate from CSR
2022/01/22 11:22:53 [INFO] generate received request
2022/01/22 11:22:53 [INFO] received CSR
2022/01/22 11:22:53 [INFO] generating key: rsa-2048
2022/01/22 11:22:53 [INFO] encoded CSR
2022/01/22 11:22:53 [INFO] signed certificate with serial number 1648300834238492117899858433529510064161500877
2022/01/22 11:22:53 [INFO] generating a new CA key and certificate from CSR
2022/01/22 11:22:53 [INFO] generate received request
2022/01/22 11:22:53 [INFO] received CSR
2022/01/22 11:22:53 [INFO] generating key: rsa-2048
2022/01/22 11:22:53 [INFO] encoded CSR
2022/01/22 11:22:53 [INFO] signed certificate with serial number 98464221463811271807915412239912610501303370456
2022/01/22 11:22:53 [INFO] generate received request
2022/01/22 11:22:53 [INFO] received CSR
2022/01/22 11:22:53 [INFO] generating key: rsa-2048
2022/01/22 11:22:54 [INFO] encoded CSR
2022/01/22 11:22:54 [INFO] signed certificate with serial number 108219184696921278282638267634702660223248794211
2022/01/22 11:22:54 [INFO] generate received request
2022/01/22 11:22:54 [INFO] received CSR
2022/01/22 11:22:54 [INFO] generating key: rsa-2048
2022/01/22 11:22:54 [INFO] encoded CSR
2022/01/22 11:22:54 [INFO] signed certificate with serial number 100743985947804933385449055726235026777733493107
2022/01/22 11:22:54 [INFO] generate received request
2022/01/22 11:22:54 [INFO] received CSR
2022/01/22 11:22:54 [INFO] generating key: rsa-2048
2022/01/22 11:22:54 [INFO] encoded CSR
2022/01/22 11:22:54 [INFO] signed certificate with serial number 402692441983869172106490106145569991540151462166
2022/01/22 11:22:55 [INFO] generate received request
2022/01/22 11:22:55 [INFO] received CSR
2022/01/22 11:22:55 [INFO] generating key: rsa-2048
2022/01/22 11:22:55 [INFO] encoded CSR
2022/01/22 11:22:55 [INFO] signed certificate with serial number 145347755005705713362260376542373107952533912264
2022/01/22 11:22:55 [INFO] generate received request
2022/01/22 11:22:55 [INFO] received CSR
2022/01/22 11:22:55 [INFO] generating key: rsa-2048
2022/01/22 11:22:55 [INFO] encoded CSR
2022/01/22 11:22:55 [INFO] signed certificate with serial number 444625893474167124490874812119152364704974892941
2022/01/22 11:22:55 [INFO] generate received request
2022/01/22 11:22:55 [INFO] received CSR
2022/01/22 11:22:55 [INFO] generating key: rsa-2048
2022/01/22 11:22:56 [INFO] encoded CSR
2022/01/22 11:22:56 [INFO] signed certificate with serial number 13166443861397405984179421934537226564625353021
2022/01/22 11:22:56 [INFO] generate received request
2022/01/22 11:22:56 [INFO] received CSR
2022/01/22 11:22:56 [INFO] generating key: rsa-2048
2022/01/22 11:22:56 [INFO] encoded CSR
2022/01/22 11:22:56 [INFO] signed certificate with serial number 477555387356878346032163818399521403974125155571
2022/01/22 11:22:56 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
2022/01/22 11:22:56 [INFO] generate received request
2022/01/22 11:22:56 [INFO] received CSR
2022/01/22 11:22:56 [INFO] generating key: rsa-2048
2022/01/22 11:22:56 [INFO] encoded CSR
2022/01/22 11:22:56 [INFO] signed certificate with serial number 443049123672177539964394357304449586541936410670
2022/01/22 11:22:56 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
2022/01/22 11:22:56 [INFO] generate received request
2022/01/22 11:22:56 [INFO] received CSR
2022/01/22 11:22:56 [INFO] generating key: rsa-2048
2022/01/22 11:22:56 [INFO] encoded CSR
2022/01/22 11:22:56 [INFO] signed certificate with serial number 348775710388321547672135974632681391156236351980
2022/01/22 11:22:56 [INFO] generate received request
2022/01/22 11:22:56 [INFO] received CSR
2022/01/22 11:22:56 [INFO] generating key: rsa-2048
2022/01/22 11:22:56 [INFO] encoded CSR
2022/01/22 11:22:56 [INFO] signed certificate with serial number 90556869903642201928420111865446530076851322599
2022/01/22 11:22:56 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
2022/01/22 11:22:56 [INFO] generate received request
2022/01/22 11:22:56 [INFO] received CSR
2022/01/22 11:22:56 [INFO] generating key: rsa-2048
2022/01/22 11:22:56 [INFO] encoded CSR
2022/01/22 11:22:56 [INFO] signed certificate with serial number 449524767757137976180797644832038306907595611727
2022/01/22 11:22:56 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
2022/01/22 11:22:56 [INFO] generate received request
2022/01/22 11:22:56 [INFO] received CSR
2022/01/22 11:22:56 [INFO] generating key: rsa-2048
2022/01/22 11:22:57 [INFO] encoded CSR
2022/01/22 11:22:57 [INFO] signed certificate with serial number 150828042393178326235972341540511913471044388243
2022/01/22 11:22:57 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "admin-k8s-controller-01" set.
Context "default" modified.
Switched to context "default".
2022/01/22 11:22:57 [INFO] generate received request
2022/01/22 11:22:57 [INFO] received CSR
2022/01/22 11:22:57 [INFO] generating key: rsa-2048
2022/01/22 11:22:57 [INFO] encoded CSR
2022/01/22 11:22:57 [INFO] signed certificate with serial number 708887565855534197901744520763332897015320148685
2022/01/22 11:22:57 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "admin-k8s-controller-02" set.
Context "default" modified.
Switched to context "default".
2022/01/22 11:22:57 [INFO] generate received request
2022/01/22 11:22:57 [INFO] received CSR
2022/01/22 11:22:57 [INFO] generating key: rsa-2048
2022/01/22 11:22:57 [INFO] encoded CSR
2022/01/22 11:22:57 [INFO] signed certificate with serial number 111531012979905216822874963122679631581934328595
2022/01/22 11:22:57 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "admin-k8s-controller-03" set.
Context "default" modified.
Switched to context "default".
2022/01/22 11:22:57 [INFO] generate received request
2022/01/22 11:22:57 [INFO] received CSR
2022/01/22 11:22:57 [INFO] generating key: rsa-2048
2022/01/22 11:22:57 [INFO] encoded CSR
2022/01/22 11:22:57 [INFO] signed certificate with serial number 432999850111225902315776103629061295161737403281
Cluster "kubernetes" set.
User "system:node:k8s-controller-01" set.
Context "system:node:k8s-controller-01" modified.
Switched to context "system:node:k8s-controller-01".
2022/01/22 11:22:58 [INFO] generate received request
2022/01/22 11:22:58 [INFO] received CSR
2022/01/22 11:22:58 [INFO] generating key: rsa-2048
2022/01/22 11:22:58 [INFO] encoded CSR
2022/01/22 11:22:58 [INFO] signed certificate with serial number 311667386943862290252900498316348481002071208013
Cluster "kubernetes" set.
User "system:node:k8s-controller-02" set.
Context "system:node:k8s-controller-02" modified.
Switched to context "system:node:k8s-controller-02".
2022/01/22 11:22:58 [INFO] generate received request
2022/01/22 11:22:58 [INFO] received CSR
2022/01/22 11:22:58 [INFO] generating key: rsa-2048
2022/01/22 11:22:58 [INFO] encoded CSR
2022/01/22 11:22:58 [INFO] signed certificate with serial number 462039752554085532303076198008663188315311441458
Cluster "kubernetes" set.
User "system:node:k8s-controller-03" set.
Context "system:node:k8s-controller-03" modified.
Switched to context "system:node:k8s-controller-03".
2022/01/22 11:22:58 [INFO] generate received request
2022/01/22 11:22:58 [INFO] received CSR
2022/01/22 11:22:58 [INFO] generating key: rsa-2048
2022/01/22 11:22:58 [INFO] encoded CSR
2022/01/22 11:22:58 [INFO] signed certificate with serial number 597016217382067601192700860614345916604926429586
Cluster "kubernetes" set.
User "system:node:k8s-worker-01" set.
Context "system:node:k8s-worker-01" modified.
Switched to context "system:node:k8s-worker-01".
2022/01/22 11:22:59 [INFO] generate received request
2022/01/22 11:22:59 [INFO] received CSR
2022/01/22 11:22:59 [INFO] generating key: rsa-2048
2022/01/22 11:22:59 [INFO] encoded CSR
2022/01/22 11:22:59 [INFO] signed certificate with serial number 589406323149728847517820735060139970855167449781
Cluster "kubernetes" set.
User "system:node:k8s-worker-02" set.
Context "system:node:k8s-worker-02" modified.
Switched to context "system:node:k8s-worker-02".
2022/01/22 11:22:59 [INFO] generate received request
2022/01/22 11:22:59 [INFO] received CSR
2022/01/22 11:22:59 [INFO] generating key: rsa-2048
2022/01/22 11:22:59 [INFO] encoded CSR
2022/01/22 11:22:59 [INFO] signed certificate with serial number 638497668444474293980619553318179727006019004953
Cluster "kubernetes" set.
User "system:node:k8s-worker-03" set.
Context "system:node:k8s-worker-03" modified.
Switched to context "system:node:k8s-worker-03".
2022/01/22 11:22:59 [INFO] generate received request
2022/01/22 11:22:59 [INFO] received CSR
2022/01/22 11:22:59 [INFO] generating key: rsa-2048
2022/01/22 11:22:59 [INFO] encoded CSR
2022/01/22 11:22:59 [INFO] signed certificate with serial number 260479962779054734385781812899336589149112480986
2022/01/22 11:22:59 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "system:kube-controller-manager-k8s-controller-01" set.
Context "default" modified.
Switched to context "default".
2022/01/22 11:23:00 [INFO] generate received request
2022/01/22 11:23:00 [INFO] received CSR
2022/01/22 11:23:00 [INFO] generating key: rsa-2048
2022/01/22 11:23:00 [INFO] encoded CSR
2022/01/22 11:23:00 [INFO] signed certificate with serial number 157560106075281612939122420225566131598603296467
2022/01/22 11:23:00 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "system:kube-controller-manager-k8s-controller-02" set.
Context "default" modified.
Switched to context "default".
2022/01/22 11:23:00 [INFO] generate received request
2022/01/22 11:23:00 [INFO] received CSR
2022/01/22 11:23:00 [INFO] generating key: rsa-2048
2022/01/22 11:23:00 [INFO] encoded CSR
2022/01/22 11:23:00 [INFO] signed certificate with serial number 580429657246538429103806161134370217838281535820
2022/01/22 11:23:00 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "system:kube-controller-manager-k8s-controller-03" set.
Context "default" modified.
Switched to context "default".
2022/01/22 11:23:01 [INFO] generate received request
2022/01/22 11:23:01 [INFO] received CSR
2022/01/22 11:23:01 [INFO] generating key: rsa-2048
2022/01/22 11:23:01 [INFO] encoded CSR
2022/01/22 11:23:01 [INFO] signed certificate with serial number 583550297979814556161547554253643771999396927588
2022/01/22 11:23:01 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "system:kube-scheduler-k8s-controller-01" set.
Context "default" modified.
Switched to context "default".
2022/01/22 11:23:01 [INFO] generate received request
2022/01/22 11:23:01 [INFO] received CSR
2022/01/22 11:23:01 [INFO] generating key: rsa-2048
2022/01/22 11:23:01 [INFO] encoded CSR
2022/01/22 11:23:01 [INFO] signed certificate with serial number 51090514389907904164172574946204022647023325545
2022/01/22 11:23:01 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "system:kube-scheduler-k8s-controller-02" set.
Context "default" modified.
Switched to context "default".
2022/01/22 11:23:02 [INFO] generate received request
2022/01/22 11:23:02 [INFO] received CSR
2022/01/22 11:23:02 [INFO] generating key: rsa-2048
2022/01/22 11:23:02 [INFO] encoded CSR
2022/01/22 11:23:02 [INFO] signed certificate with serial number 629228985723551637158313525757647433426180042201
2022/01/22 11:23:02 [WARNING] This certificate lacks a "hosts" field. This makes it unsuitable for
websites. For more information see the Baseline Requirements for the Issuance and Management
of Publicly-Trusted Certificates, v.1.1.6, from the CA/Browser Forum (https://cabforum.org);
specifically, section 10.2.3 ("Information Requirements").
Cluster "kubernetes" set.
User "system:kube-scheduler-k8s-controller-03" set.
Context "default" modified.
Switched to context "default".
Generating RSA private key, 3072 bit long modulus (2 primes)
................++++
.......................................................++++
e is 65537 (0x010001)
writing RSA key
</code></pre></div></div>
</div>

## Ansible

The next step is to run Ansible on all the nodes that are part of this cluster, including both controller and worker nodes. I've published the [Ansible configuration][ansible-commit] that was used to do this. Using this Ansible playbook, the Kubernetes cluster can be set up in one single playbook run.

### Variables

ansible/group_vars/[all.yml][all-yml]
```
---
domain: lab.alexgardner.id.au
email: alex+homelab@alexgardner.id.au

nameservers:
  - '10.1.1.31'
  - '10.1.1.32'
  - '10.1.1.33'
  - '10.1.1.1'
network_subnets:
  - '10.1.1.0/24'
  - '10.1.2.0/24'
  - '10.1.3.0/24'

firewall_servers_subnet: 10.1.1.0/24
firewall_wireless_subnet: 10.1.2.0/24
firewall_clients_subnet: 10.1.3.0/24

timezone: Australia/Sydney

admin_users:
  - adminuser
```

ansible/group_vars/[k8s_controllers.yml][k8s_controllers-yml]
```
---
kubernetes_clients_hosts_list:
  - '10.1.3.100'
kubernetes_cluster_name: kubernetes
kubernetes_cluster_fqdn: k8s-controller.{% raw %}{{ domain }}{% endraw %}
kubernetes_pod_network_cidr: 10.10.0.0/16
kubernetes_secrets_key_aescbc: 
#checkov:skip=CKV_SECRET_6:Unencrypted secrets are git-ignored

pacemaker_hosts_list: "{% raw %}{{ groups['k8s_controllers'] | map('extract',hostvars,'ansible_host') | list }}{% endraw %}"
pacemaker_hosts: "{% raw %}{{ groups['k8s_controllers'] }}{% endraw %}"
pacemaker_primary_host: "{% raw %}{{ groups['k8s_controllers'][0] }}{% endraw %}"
pacemaker_cluster_name: k8s-controller
pacemaker_cluster_ip: '10.1.1.40'
```

### Commands
```
cd ansible
ansible-playbook -i production k8s-all.yml
```

<div class="blog_post_output hidden">

<h3 id="output">Output</h3>
<p>(Click to show/hide the output)</p>
<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>[user@workstation ansible]$ ansible-playbook -i production k8s-all.yml

PLAY [k8s_all] ********************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
[WARNING]: Platform linux on host k8s-controller-02 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-02]
[WARNING]: Platform linux on host k8s-worker-02 is using the discovered Python interpreter at /usr/bin/python3.7, but
future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-worker-02]
[WARNING]: Platform linux on host k8s-worker-01 is using the discovered Python interpreter at /usr/bin/python3.7, but
future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-worker-01]
[WARNING]: Platform linux on host k8s-controller-01 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-01]
[WARNING]: Platform linux on host k8s-controller-03 is using the discovered Python interpreter at /usr/bin/python3.7,
but future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-controller-03]
[WARNING]: Platform linux on host k8s-worker-03 is using the discovered Python interpreter at /usr/bin/python3.7, but
future installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [k8s-worker-03]

TASK [common | set variables] *****************************************************************************************
ok: [k8s-controller-01] => (item=/homelab-infrastructure/ansible/roles/common/vars/Debian.yml)
ok: [k8s-controller-02] => (item=/homelab-infrastructure/ansible/roles/common/vars/Debian.yml)
ok: [k8s-controller-03] => (item=/homelab-infrastructure/ansible/roles/common/vars/Debian.yml)
ok: [k8s-worker-01] => (item=/homelab-infrastructure/ansible/roles/common/vars/Debian.yml)
ok: [k8s-worker-02] => (item=/homelab-infrastructure/ansible/roles/common/vars/Debian.yml)
ok: [k8s-worker-03] => (item=/homelab-infrastructure/ansible/roles/common/vars/Debian.yml)

TASK [common | populate service facts] ********************************************************************************
ok: [k8s-controller-02]
ok: [k8s-worker-01]
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [common : network | update hostname] *****************************************************************************
skipping: [k8s-controller-01]
skipping: [k8s-controller-02]
skipping: [k8s-controller-03]
skipping: [k8s-worker-01]
skipping: [k8s-worker-02]
skipping: [k8s-worker-03]

TASK [common : network | configure /etc/resolv.conf] ******************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [common : network | configure /etc/hosts] ************************************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [common : firewall] **********************************************************************************************
included: /homelab-infrastructure/ansible/roles/common/tasks/firewall-Debian.yml for k8s-controller-01, k8s-controller-02, k8s-controller-03, k8s-worker-01, k8s-worker-02, k8s-worker-03

TASK [common : firewall | install ufw package] ************************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-03]
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]

TASK [common : firewall | allow ssh inbound from clients] *************************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [common : firewall | set outbound default] ***********************************************************************
ok: [k8s-controller-02]
ok: [k8s-worker-01]
ok: [k8s-controller-01]
ok: [k8s-controller-03]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [common : firewall | set inbound default] ************************************************************************
ok: [k8s-controller-02]
ok: [k8s-worker-01]
ok: [k8s-controller-01]
ok: [k8s-controller-03]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [common : firewall | enable firewall] ****************************************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [common : ntp | update timezone] *********************************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-worker-03]

TASK [common : ntp | install ntp package] *****************************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-03]
changed: [k8s-controller-01]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-01]

TASK [common : ntp | configure /etc/ntp.conf] *************************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-worker-01]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [common : ntp | start and enable ntp service] ********************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-worker-01]
ok: [k8s-controller-03]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [packages | install common packages] *****************************************************************************
changed: [k8s-controller-02] => (item=htop)
changed: [k8s-controller-01] => (item=htop)
changed: [k8s-worker-01] => (item=htop)
changed: [k8s-controller-03] => (item=htop)
changed: [k8s-worker-02] => (item=htop)
changed: [k8s-controller-02] => (item=lsof)
ok: [k8s-controller-02] => (item=net-tools)
ok: [k8s-controller-02] => (item=screen)
changed: [k8s-controller-01] => (item=lsof)
changed: [k8s-worker-01] => (item=lsof)
changed: [k8s-controller-03] => (item=lsof)
changed: [k8s-worker-02] => (item=lsof)
ok: [k8s-controller-01] => (item=net-tools)
ok: [k8s-worker-01] => (item=net-tools)
ok: [k8s-controller-03] => (item=net-tools)
changed: [k8s-controller-02] => (item=strace)
ok: [k8s-worker-02] => (item=net-tools)
ok: [k8s-controller-01] => (item=screen)
ok: [k8s-worker-01] => (item=screen)
ok: [k8s-controller-03] => (item=screen)
ok: [k8s-worker-02] => (item=screen)
changed: [k8s-controller-02] => (item=telnet)
ok: [k8s-controller-02] => (item=vim)
changed: [k8s-controller-01] => (item=strace)
changed: [k8s-worker-01] => (item=strace)
changed: [k8s-controller-03] => (item=strace)
changed: [k8s-worker-02] => (item=strace)
changed: [k8s-controller-01] => (item=telnet)
changed: [k8s-worker-01] => (item=telnet)
changed: [k8s-controller-03] => (item=telnet)
ok: [k8s-controller-01] => (item=vim)
changed: [k8s-worker-02] => (item=telnet)
ok: [k8s-worker-01] => (item=vim)
ok: [k8s-controller-03] => (item=vim)
ok: [k8s-worker-02] => (item=vim)
changed: [k8s-controller-02] => (item=gpg)
changed: [k8s-controller-02] => (item=rsync)
changed: [k8s-controller-02] => (item=arping)
changed: [k8s-controller-01] => (item=gpg)
changed: [k8s-worker-01] => (item=gpg)
changed: [k8s-worker-02] => (item=gpg)
changed: [k8s-controller-01] => (item=rsync)
changed: [k8s-controller-02] => (item=dnsutils)
changed: [k8s-controller-03] => (item=gpg)
changed: [k8s-controller-02] => (item=apt-transport-https)
ok: [k8s-controller-02] => (item=ca-certificates)
changed: [k8s-controller-01] => (item=arping)
changed: [k8s-worker-01] => (item=rsync)
ok: [k8s-controller-02] => (item=curl)
changed: [k8s-worker-02] => (item=rsync)
ok: [k8s-controller-02] => (item=gnupg)
ok: [k8s-controller-02] => (item=lsb-release)
changed: [k8s-controller-03] => (item=rsync)
changed: [k8s-worker-01] => (item=arping)
changed: [k8s-controller-02] => (item=tree)
changed: [k8s-worker-02] => (item=arping)
changed: [k8s-controller-03] => (item=arping)
changed: [k8s-worker-03] => (item=htop)
changed: [k8s-controller-01] => (item=dnsutils)
changed: [k8s-worker-03] => (item=lsof)
ok: [k8s-worker-03] => (item=net-tools)
changed: [k8s-controller-01] => (item=apt-transport-https)
ok: [k8s-worker-03] => (item=screen)
changed: [k8s-worker-01] => (item=dnsutils)
ok: [k8s-controller-01] => (item=ca-certificates)
changed: [k8s-worker-02] => (item=dnsutils)
ok: [k8s-controller-01] => (item=curl)
changed: [k8s-controller-03] => (item=dnsutils)
changed: [k8s-worker-01] => (item=apt-transport-https)
changed: [k8s-worker-03] => (item=strace)
ok: [k8s-controller-01] => (item=gnupg)
ok: [k8s-worker-01] => (item=ca-certificates)
ok: [k8s-controller-01] => (item=lsb-release)
changed: [k8s-worker-02] => (item=apt-transport-https)
ok: [k8s-worker-01] => (item=curl)
changed: [k8s-worker-03] => (item=telnet)
changed: [k8s-controller-03] => (item=apt-transport-https)
ok: [k8s-worker-02] => (item=ca-certificates)
ok: [k8s-worker-03] => (item=vim)
ok: [k8s-worker-01] => (item=gnupg)
ok: [k8s-controller-03] => (item=ca-certificates)
ok: [k8s-worker-02] => (item=curl)
ok: [k8s-worker-01] => (item=lsb-release)
ok: [k8s-controller-03] => (item=curl)
changed: [k8s-controller-01] => (item=tree)
ok: [k8s-worker-02] => (item=gnupg)
ok: [k8s-controller-03] => (item=gnupg)
ok: [k8s-worker-02] => (item=lsb-release)
ok: [k8s-controller-03] => (item=lsb-release)
changed: [k8s-worker-01] => (item=tree)
changed: [k8s-worker-02] => (item=tree)
changed: [k8s-controller-03] => (item=tree)
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
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [common : auto-updates] ******************************************************************************************
included: /homelab-infrastructure/ansible/roles/common/tasks/auto-update-Debian.yml for k8s-controller-01, k8s-controller-02, k8s-controller-03, k8s-worker-01, k8s-worker-02, k8s-worker-03

TASK [common : auto-updates | install unattended-upgrades package] ****************************************************
ok: [k8s-controller-02]
ok: [k8s-worker-01]
ok: [k8s-worker-03]
ok: [k8s-worker-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]

TASK [common : auto-updates | configure /etc/apt/apt.conf.d/20auto-upgrades] ******************************************
changed: [k8s-controller-02]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [common : auto-updates | configure /etc/apt/apt.conf.d/50unattended-upgrades] ************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [common : auto-updates | start and enable unattended-upgrades service] *******************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]
ok: [k8s-worker-02]
ok: [k8s-worker-01]
ok: [k8s-worker-03]

TASK [common : users | install sudo package] **************************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]
ok: [k8s-worker-01]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

TASK [common : users | create admin users] ****************************************************************************
changed: [k8s-controller-02] => (item=adminuser)
changed: [k8s-controller-01] => (item=adminuser)
changed: [k8s-worker-02] => (item=adminuser)
changed: [k8s-controller-03] => (item=adminuser)
changed: [k8s-worker-01] => (item=adminuser)
changed: [k8s-worker-03] => (item=adminuser)

TASK [common : users | configure etc/sudoers.d/20_admins_sudo] ********************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-worker-03]

RUNNING HANDLER [common : auto-updates | restart unattended-upgrades service] *****************************************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-controller-01]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [docker | set variables] *****************************************************************************************
ok: [k8s-controller-01] => (item=/homelab-infrastructure/ansible/roles/docker/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab-infrastructure/ansible/roles/docker/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab-infrastructure/ansible/roles/docker/vars/default.yml)
ok: [k8s-worker-01] => (item=/homelab-infrastructure/ansible/roles/docker/vars/default.yml)
ok: [k8s-worker-02] => (item=/homelab-infrastructure/ansible/roles/docker/vars/default.yml)
ok: [k8s-worker-03] => (item=/homelab-infrastructure/ansible/roles/docker/vars/default.yml)

TASK [docker] *********************************************************************************************************
included: /homelab-infrastructure/ansible/roles/docker/tasks/docker.yml for k8s-controller-01, k8s-controller-02, k8s-controller-03, k8s-worker-01, k8s-worker-02, k8s-worker-03

TASK [docker | install docker key] ************************************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-01]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-worker-03]

TASK [docker | add docker repo] ***************************************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-worker-03]

TASK [docker | install docker engine packages] ************************************************************************
changed: [k8s-controller-02] => (item=docker-ce)
ok: [k8s-controller-02] => (item=docker-ce-cli)
ok: [k8s-controller-02] => (item=containerd.io)
changed: [k8s-worker-02] => (item=docker-ce)
ok: [k8s-worker-02] => (item=docker-ce-cli)
ok: [k8s-worker-02] => (item=containerd.io)
changed: [k8s-worker-01] => (item=docker-ce)
changed: [k8s-controller-01] => (item=docker-ce)
changed: [k8s-controller-03] => (item=docker-ce)
ok: [k8s-controller-01] => (item=docker-ce-cli)
ok: [k8s-worker-01] => (item=docker-ce-cli)
ok: [k8s-controller-03] => (item=docker-ce-cli)
ok: [k8s-controller-01] => (item=containerd.io)
ok: [k8s-worker-01] => (item=containerd.io)
ok: [k8s-controller-03] => (item=containerd.io)
changed: [k8s-worker-03] => (item=docker-ce)
ok: [k8s-worker-03] => (item=docker-ce-cli)
ok: [k8s-worker-03] => (item=containerd.io)

TASK [docker | configure /etc/docker/daemon.json] *********************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-worker-02]
changed: [k8s-worker-03]

TASK [docker | configure /etc/containerd/config.toml] *****************************************************************
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-worker-02]
changed: [k8s-controller-02]
changed: [k8s-worker-03]

TASK [docker | start and enable docker service] ***********************************************************************
ok: [k8s-controller-02]
ok: [k8s-worker-02]
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-worker-01]
ok: [k8s-worker-03]

TASK [docker | start and enable containerd service] *******************************************************************
ok: [k8s-controller-02]
ok: [k8s-worker-01]
ok: [k8s-controller-03]
ok: [k8s-controller-01]
ok: [k8s-worker-02]
ok: [k8s-worker-03]

RUNNING HANDLER [docker | restart docker] *****************************************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-03]
changed: [k8s-worker-02]
changed: [k8s-worker-01]
changed: [k8s-controller-03]
changed: [k8s-controller-01]

RUNNING HANDLER [docker | restart containerd] *************************************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-03]
changed: [k8s-worker-01]
changed: [k8s-worker-02]

TASK [kubernetes_common : kubernetes-common | set variables] **********************************************************
ok: [k8s-controller-01] => (item=/homelab-infrastructure/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab-infrastructure/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab-infrastructure/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-worker-01] => (item=/homelab-infrastructure/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-worker-02] => (item=/homelab-infrastructure/ansible/roles/kubernetes_common/vars/default.yml)
ok: [k8s-worker-03] => (item=/homelab-infrastructure/ansible/roles/kubernetes_common/vars/default.yml)

TASK [kubernetes_common : swap | disable swap] ************************************************************************
skipping: [k8s-controller-01]
skipping: [k8s-controller-02]
skipping: [k8s-controller-03]
skipping: [k8s-worker-01]
skipping: [k8s-worker-02]
skipping: [k8s-worker-03]

TASK [kubernetes_common : swap | disable swap on system start] ********************************************************
ok: [k8s-controller-02] => (item=swap)
ok: [k8s-worker-02] => (item=swap)
ok: [k8s-controller-01] => (item=swap)
ok: [k8s-worker-01] => (item=swap)
ok: [k8s-controller-03] => (item=swap)
ok: [k8s-controller-02] => (item=none)
ok: [k8s-worker-02] => (item=none)
ok: [k8s-controller-01] => (item=none)
ok: [k8s-worker-01] => (item=none)
ok: [k8s-worker-03] => (item=swap)
ok: [k8s-controller-03] => (item=none)
ok: [k8s-worker-03] => (item=none)

TASK [kubernetes_common : network | configure /etc/modules-load.d/k8s.conf] *******************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [kubernetes_common : network | configure /etc/sysctl.d/k8s.conf] *************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [kubernetes_common : packages | install kubernetes key] **********************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [kubernetes_common : packages | add kubernetes repo] *************************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
changed: [k8s-worker-02]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [kubernetes_common : packages | install kubernetes packages] *****************************************************
changed: [k8s-worker-01] => (item=kubelet)
changed: [k8s-controller-02] => (item=kubelet)
changed: [k8s-controller-02] => (item=kubeadm)
changed: [k8s-worker-02] => (item=kubelet)
changed: [k8s-controller-01] => (item=kubelet)
changed: [k8s-controller-03] => (item=kubelet)
ok: [k8s-controller-02] => (item=kubectl)
changed: [k8s-worker-01] => (item=kubeadm)
ok: [k8s-worker-01] => (item=kubectl)
changed: [k8s-worker-02] => (item=kubeadm)
ok: [k8s-worker-02] => (item=kubectl)
changed: [k8s-worker-03] => (item=kubelet)
changed: [k8s-controller-03] => (item=kubeadm)
changed: [k8s-controller-01] => (item=kubeadm)
ok: [k8s-controller-03] => (item=kubectl)
ok: [k8s-controller-01] => (item=kubectl)
changed: [k8s-worker-03] => (item=kubeadm)
ok: [k8s-worker-03] => (item=kubectl)

TASK [kubernetes_common : packages | prevent kubernetes from being upgraded] ******************************************
changed: [k8s-controller-02] => (item=kubelet)
changed: [k8s-worker-02] => (item=kubelet)
changed: [k8s-controller-03] => (item=kubelet)
changed: [k8s-worker-01] => (item=kubelet)
changed: [k8s-controller-01] => (item=kubelet)
changed: [k8s-controller-02] => (item=kubeadm)
changed: [k8s-worker-02] => (item=kubeadm)
changed: [k8s-worker-01] => (item=kubeadm)
changed: [k8s-controller-03] => (item=kubeadm)
changed: [k8s-controller-01] => (item=kubeadm)
changed: [k8s-controller-02] => (item=kubectl)
changed: [k8s-controller-03] => (item=kubectl)
changed: [k8s-controller-01] => (item=kubectl)
changed: [k8s-worker-01] => (item=kubectl)
changed: [k8s-worker-02] => (item=kubectl)
changed: [k8s-worker-03] => (item=kubelet)
changed: [k8s-worker-03] => (item=kubeadm)
changed: [k8s-worker-03] => (item=kubectl)

TASK [kubernetes_common : directories | manage kubernetes directories] ************************************************
ok: [k8s-controller-02] => (item=/etc/kubernetes/)
ok: [k8s-controller-01] => (item=/etc/kubernetes/)
ok: [k8s-worker-02] => (item=/etc/kubernetes/)
ok: [k8s-worker-01] => (item=/etc/kubernetes/)
ok: [k8s-controller-03] => (item=/etc/kubernetes/)
changed: [k8s-controller-02] => (item=/etc/kubernetes/pki/)
changed: [k8s-controller-01] => (item=/etc/kubernetes/pki/)
changed: [k8s-worker-02] => (item=/etc/kubernetes/pki/)
changed: [k8s-worker-01] => (item=/etc/kubernetes/pki/)
changed: [k8s-controller-03] => (item=/etc/kubernetes/pki/)
ok: [k8s-worker-03] => (item=/etc/kubernetes/)
changed: [k8s-worker-03] => (item=/etc/kubernetes/pki/)

TASK [kubernetes_common : pki | configure /etc/kubernetes/kubelet.conf] ***********************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

TASK [kubernetes_common : pki | configure /etc/kubernetes/pki/ca.crt] *************************************************
changed: [k8s-controller-02]
changed: [k8s-worker-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]
changed: [k8s-worker-01]
changed: [k8s-worker-03]

PLAY [k8s_controllers] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]

TASK [pacemaker | set variables] **************************************************************************************
ok: [k8s-controller-01] => (item=/homelab-infrastructure/ansible/roles/pacemaker/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab-infrastructure/ansible/roles/pacemaker/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab-infrastructure/ansible/roles/pacemaker/vars/default.yml)

TASK [network | allow pacemaker tcp inbound from pacemaker servers] ***************************************************
changed: [k8s-controller-02] => (item=['2224', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['2224', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['2224', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['2224', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['2224', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['2224', '10.1.1.42'])
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
changed: [k8s-controller-03] => (item=['21064', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['21064', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['21064', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['21064', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['21064', '10.1.1.43'])

TASK [network | allow pacemaker udp inbound from pacemaker servers] ***************************************************
changed: [k8s-controller-01] => (item=['5405', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['5405', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['5405', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['5405', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['5405', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['5405', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['5405', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['5405', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['5405', '10.1.1.43'])

TASK [packages | install pacemaker packages] **************************************************************************
changed: [k8s-controller-02] => (item=pacemaker)
ok: [k8s-controller-02] => (item=corosync)
changed: [k8s-controller-03] => (item=pacemaker)
changed: [k8s-controller-01] => (item=pacemaker)
ok: [k8s-controller-03] => (item=corosync)
ok: [k8s-controller-01] => (item=corosync)
changed: [k8s-controller-02] => (item=pcs)
changed: [k8s-controller-02] => (item=crmsh)
changed: [k8s-controller-03] => (item=pcs)
changed: [k8s-controller-01] => (item=pcs)
changed: [k8s-controller-03] => (item=crmsh)
changed: [k8s-controller-01] => (item=crmsh)

TASK [pacemaker : services | start and enable services] ***************************************************************
ok: [k8s-controller-01] => (item=pacemaker)
ok: [k8s-controller-03] => (item=pacemaker)
ok: [k8s-controller-02] => (item=pacemaker)
ok: [k8s-controller-01] => (item=corosync)
ok: [k8s-controller-03] => (item=corosync)
ok: [k8s-controller-02] => (item=corosync)
ok: [k8s-controller-02] => (item=pcsd)
ok: [k8s-controller-03] => (item=pcsd)
ok: [k8s-controller-01] => (item=pcsd)

TASK [pacemaker : corosync | configure /etc/corosync/authkey] *********************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]

TASK [pacemaker : corosync | configure /etc/corosync/corosync.conf] ***************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]
[WARNING]: flush_handlers task does not support when conditional

RUNNING HANDLER [pacemaker : corosync | restart corosync] *************************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]

TASK [pacemaker : settings | capture cluster properties] **************************************************************
ok: [k8s-controller-01]

TASK [pacemaker : settings | disable stonith] *************************************************************************
changed: [k8s-controller-01]

TASK [kubernetes_controller : kubernetes-controller | set variables] **************************************************
ok: [k8s-controller-01] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-02] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)
ok: [k8s-controller-03] => (item=/homelab-infrastructure/ansible/roles/kubernetes_controller/vars/default.yml)

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
changed: [k8s-controller-03] => (item=['2380', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['2380', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['2380', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['2380', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['2380', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['2380', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['2380', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['2380', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['10250', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['10250', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['10250', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['10250', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['10250', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['10250', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['10250', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['10250', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['10250', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['10251', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['10251', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['10251', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['10251', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['10251', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['10251', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['10251', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['10251', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['10251', '10.1.1.43'])
changed: [k8s-controller-02] => (item=['10252', '10.1.1.41'])
changed: [k8s-controller-01] => (item=['10252', '10.1.1.41'])
changed: [k8s-controller-03] => (item=['10252', '10.1.1.41'])
changed: [k8s-controller-02] => (item=['10252', '10.1.1.42'])
changed: [k8s-controller-01] => (item=['10252', '10.1.1.42'])
changed: [k8s-controller-03] => (item=['10252', '10.1.1.42'])
changed: [k8s-controller-02] => (item=['10252', '10.1.1.43'])
changed: [k8s-controller-01] => (item=['10252', '10.1.1.43'])
changed: [k8s-controller-03] => (item=['10252', '10.1.1.43'])

TASK [kubernetes_controller : network | allow kubernetes api inbound from kubernetes servers] *************************
changed: [k8s-controller-02] => (item=10.1.1.41)
changed: [k8s-controller-01] => (item=10.1.1.41)
changed: [k8s-controller-03] => (item=10.1.1.41)
changed: [k8s-controller-01] => (item=10.1.1.42)
changed: [k8s-controller-03] => (item=10.1.1.42)
changed: [k8s-controller-02] => (item=10.1.1.42)
changed: [k8s-controller-02] => (item=10.1.1.43)
changed: [k8s-controller-01] => (item=10.1.1.43)
changed: [k8s-controller-03] => (item=10.1.1.43)
changed: [k8s-controller-01] => (item=10.1.1.51)
changed: [k8s-controller-02] => (item=10.1.1.51)
changed: [k8s-controller-03] => (item=10.1.1.51)
changed: [k8s-controller-01] => (item=10.1.1.52)
changed: [k8s-controller-03] => (item=10.1.1.52)
changed: [k8s-controller-02] => (item=10.1.1.52)
changed: [k8s-controller-01] => (item=10.1.1.53)
changed: [k8s-controller-03] => (item=10.1.1.53)
changed: [k8s-controller-02] => (item=10.1.1.53)

TASK [kubernetes_controller : network | allow kubernetes api inbound from permitted clients] **************************
changed: [k8s-controller-02] => (item=10.1.3.100)
changed: [k8s-controller-03] => (item=10.1.3.100)
changed: [k8s-controller-01] => (item=10.1.3.100)

TASK [kubernetes_controller : pacemaker | capture configured resources] ***********************************************
ok: [k8s-controller-01]

TASK [kubernetes_controller : pacemaker | create kubernetes-ip resource] **********************************************
changed: [k8s-controller-01] => (item={'resource_id': 'kubernetes-ip', 'action': 'create', 'provider': 'ocf:heartbeat:IPaddr2', 'options': ['ip=10.1.1.150', 'cidr_netmask=24', 'nic=ens3'], 'op': 'monitor', 'op_options': ['interval=30s']})

TASK [kubernetes_controller : pacemaker | pause to allow floating ip address to come online] **************************
Pausing for 30 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
ok: [k8s-controller-01]

TASK [kubernetes_controller : pacemaker | refresh ip address facts] ***************************************************
ok: [k8s-controller-02]
ok: [k8s-controller-01]
ok: [k8s-controller-03]

TASK [kubernetes_controller : directories | manage kubernetes directories] ********************************************
changed: [k8s-controller-02] => (item=/etc/kubernetes/pki/etcd/)
changed: [k8s-controller-01] => (item=/etc/kubernetes/pki/etcd/)
changed: [k8s-controller-03] => (item=/etc/kubernetes/pki/etcd/)
changed: [k8s-controller-01] => (item=/var/lib/kubernetes/)
changed: [k8s-controller-03] => (item=/var/lib/kubernetes/)
changed: [k8s-controller-02] => (item=/var/lib/kubernetes/)
changed: [k8s-controller-03] => (item=/root/.kube/)
changed: [k8s-controller-01] => (item=/root/.kube/)
changed: [k8s-controller-02] => (item=/root/.kube/)

TASK [kubernetes_controller : pki | configure /root/.kube/config] *****************************************************
changed: [k8s-controller-02]
changed: [k8s-controller-03]
changed: [k8s-controller-01]

TASK [kubernetes_controller : pki | configure /etc/kubernetes/{{ item }}.conf] ****************************************
changed: [k8s-controller-02] => (item=admin)
changed: [k8s-controller-01] => (item=admin)
changed: [k8s-controller-03] => (item=admin)
changed: [k8s-controller-02] => (item=controller-manager)
changed: [k8s-controller-01] => (item=controller-manager)
changed: [k8s-controller-03] => (item=controller-manager)
changed: [k8s-controller-02] => (item=scheduler)
changed: [k8s-controller-01] => (item=scheduler)
changed: [k8s-controller-03] => (item=scheduler)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/{{ item }}.crt] *************************************
changed: [k8s-controller-02] => (item=front-proxy-ca)
changed: [k8s-controller-01] => (item=front-proxy-ca)
changed: [k8s-controller-03] => (item=front-proxy-ca)
changed: [k8s-controller-02] => (item=apiserver-etcd-client)
changed: [k8s-controller-01] => (item=apiserver-etcd-client)
changed: [k8s-controller-03] => (item=apiserver-etcd-client)
changed: [k8s-controller-02] => (item=apiserver)
changed: [k8s-controller-01] => (item=apiserver)
changed: [k8s-controller-03] => (item=apiserver)
changed: [k8s-controller-02] => (item=apiserver-kubelet-client)
changed: [k8s-controller-01] => (item=apiserver-kubelet-client)
changed: [k8s-controller-03] => (item=apiserver-kubelet-client)
changed: [k8s-controller-02] => (item=front-proxy-client)
changed: [k8s-controller-01] => (item=front-proxy-client)
changed: [k8s-controller-03] => (item=front-proxy-client)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/{{ item }}.key] *************************************
changed: [k8s-controller-03] => (item=apiserver-etcd-client)
changed: [k8s-controller-01] => (item=apiserver-etcd-client)
changed: [k8s-controller-02] => (item=apiserver-etcd-client)
changed: [k8s-controller-02] => (item=apiserver)
changed: [k8s-controller-03] => (item=apiserver)
changed: [k8s-controller-01] => (item=apiserver)
changed: [k8s-controller-01] => (item=apiserver-kubelet-client)
changed: [k8s-controller-03] => (item=apiserver-kubelet-client)
changed: [k8s-controller-02] => (item=apiserver-kubelet-client)
changed: [k8s-controller-02] => (item=front-proxy-client)
changed: [k8s-controller-03] => (item=front-proxy-client)
changed: [k8s-controller-01] => (item=front-proxy-client)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/etcd/{{ item }}.crt] ********************************
changed: [k8s-controller-02] => (item=ca)
changed: [k8s-controller-01] => (item=ca)
changed: [k8s-controller-03] => (item=ca)
changed: [k8s-controller-01] => (item=healthcheck-client)
changed: [k8s-controller-03] => (item=healthcheck-client)
changed: [k8s-controller-02] => (item=healthcheck-client)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/etcd/{{ item }}.key] ********************************
changed: [k8s-controller-01] => (item=healthcheck-client)
changed: [k8s-controller-02] => (item=healthcheck-client)
changed: [k8s-controller-03] => (item=healthcheck-client)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/etcd/{{ item }}.crt] ********************************
changed: [k8s-controller-01] => (item=peer)
changed: [k8s-controller-03] => (item=peer)
changed: [k8s-controller-02] => (item=peer)
changed: [k8s-controller-01] => (item=server)
changed: [k8s-controller-03] => (item=server)
changed: [k8s-controller-02] => (item=server)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/etcd/{{ item }}.key] ********************************
changed: [k8s-controller-02] => (item=peer)
changed: [k8s-controller-03] => (item=peer)
changed: [k8s-controller-01] => (item=peer)
changed: [k8s-controller-02] => (item=server)
changed: [k8s-controller-03] => (item=server)
changed: [k8s-controller-01] => (item=server)

TASK [kubernetes_controller : pki | configure /etc/kubernetes/pki/sa.{{ item }}] **************************************
changed: [k8s-controller-02] => (item=key)
changed: [k8s-controller-03] => (item=key)
changed: [k8s-controller-01] => (item=key)
changed: [k8s-controller-02] => (item=pub)
changed: [k8s-controller-03] => (item=pub)
changed: [k8s-controller-01] => (item=pub)

TASK [kubernetes_controller : encryption | configure /var/lib/kubernetes/encryption-config.yaml] **********************
changed: [k8s-controller-02]
changed: [k8s-controller-01]
changed: [k8s-controller-03]

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

PLAY [k8s_workers] ****************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
ok: [k8s-worker-03]
ok: [k8s-worker-01]
ok: [k8s-worker-02]

TASK [kubernetes_worker : kubernetes-worker | set variables] **********************************************************
ok: [k8s-worker-01] => (item=/homelab-infrastructure/ansible/roles/kubernetes_worker/vars/default.yml)
ok: [k8s-worker-02] => (item=/homelab-infrastructure/ansible/roles/kubernetes_worker/vars/default.yml)
ok: [k8s-worker-03] => (item=/homelab-infrastructure/ansible/roles/kubernetes_worker/vars/default.yml)

TASK [kubernetes_worker : network | allow kubelet api inbound from kubernetes controllers] ****************************
changed: [k8s-worker-01] => (item=10.1.1.41)
changed: [k8s-worker-03] => (item=10.1.1.41)
changed: [k8s-worker-02] => (item=10.1.1.41)
changed: [k8s-worker-03] => (item=10.1.1.42)
changed: [k8s-worker-01] => (item=10.1.1.42)
changed: [k8s-worker-02] => (item=10.1.1.42)
changed: [k8s-worker-03] => (item=10.1.1.43)
changed: [k8s-worker-01] => (item=10.1.1.43)
changed: [k8s-worker-02] => (item=10.1.1.43)

TASK [kubernetes_worker : network | allow nodeport services inbound from kubernetes servers] **************************
changed: [k8s-worker-03] => (item=10.1.1.41)
changed: [k8s-worker-01] => (item=10.1.1.41)
changed: [k8s-worker-02] => (item=10.1.1.41)
changed: [k8s-worker-03] => (item=10.1.1.42)
changed: [k8s-worker-01] => (item=10.1.1.42)
changed: [k8s-worker-02] => (item=10.1.1.42)
changed: [k8s-worker-03] => (item=10.1.1.43)
changed: [k8s-worker-01] => (item=10.1.1.43)
changed: [k8s-worker-02] => (item=10.1.1.43)
changed: [k8s-worker-03] => (item=10.1.1.51)
changed: [k8s-worker-01] => (item=10.1.1.51)
changed: [k8s-worker-02] => (item=10.1.1.51)
changed: [k8s-worker-03] => (item=10.1.1.52)
changed: [k8s-worker-01] => (item=10.1.1.52)
changed: [k8s-worker-02] => (item=10.1.1.52)
changed: [k8s-worker-03] => (item=10.1.1.53)
changed: [k8s-worker-02] => (item=10.1.1.53)
changed: [k8s-worker-01] => (item=10.1.1.53)

TASK [kubernetes_worker : kubeadm | create join token] ****************************************************************
changed: [k8s-worker-01 -> k8s-controller-01]

TASK [kubernetes_worker : kubeadm | store join token] *****************************************************************
changed: [k8s-worker-01]

TASK [kubernetes_worker : kubeadm | join workers] *********************************************************************
changed: [k8s-worker-03]
changed: [k8s-worker-02]
changed: [k8s-worker-01]

PLAY RECAP ************************************************************************************************************
k8s-controller-01          : ok=81   changed=55   unreachable=0    failed=0    skipped=3    rescued=0    ignored=0   
k8s-controller-02          : ok=74   changed=51   unreachable=0    failed=0    skipped=4    rescued=0    ignored=0   
k8s-controller-03          : ok=74   changed=51   unreachable=0    failed=0    skipped=4    rescued=0    ignored=0   
k8s-worker-01              : ok=55   changed=35   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   
k8s-worker-02              : ok=53   changed=33   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   
k8s-worker-03              : ok=53   changed=33   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   
</code></pre></div></div>
</div>

## Kubernetes

There is now a Kubernetes cluster with 3 controller nodes and 3 worker nodes. This is confirmed by going onto one of the controller nodes and running `kubectl get nodes`. Note that the status is showing as `NotReady`, this is because no CNI provider has been set up yet to provide pod connectivity.

```
adminuser@k8s-controller-02:~$ sudo kubectl get nodes
NAME                STATUS     ROLES                  AGE     VERSION
k8s-controller-01   NotReady   control-plane,master   2m21s   v1.23.2
k8s-controller-02   NotReady   control-plane,master   70s     v1.23.2
k8s-controller-03   NotReady   control-plane,master   51s     v1.23.2
k8s-worker-01       NotReady   <none>                 17s     v1.23.2
k8s-worker-02       NotReady   <none>                 17s     v1.23.2
k8s-worker-03       NotReady   <none>                 17s     v1.23.2
```

~~This is ok though, as the cluster itself is up and the API can take commands, leading to the next step which is to set up the gitops workflow so that Kubernetes can be configured via git.~~

\[Edit\]: This was _not_ actually ok and was a rookie mistake/assumption on my part. It was easy enough to fix though, which was the [first thing I did][homelab-refresh-k8s-network] while setting up the Gitops configuration.

Next up: [Kubernetes Gitops][homelab-refresh-k8s-gitops]

[homelab-refresh]:             {% link _posts/2022-01-07-home-lab-refresh.md %}
[homelab-refresh-dns]:         {% link _posts/2022-01-13-home-lab-refresh-dns.md %}
[homelab-refresh-k8s-gitops]:  {% link _posts/2022-01-25-home-lab-refresh-kubernetes-gitops.md %}
[homelab-refresh-k8s-network]: {% link _posts/2022-01-25-home-lab-refresh-kubernetes-gitops.md %}#fixing-the-cluster-networking

[gitops]:          https://about.gitlab.com/topics/gitops/
[kubeadm-install]: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/

[terraform-commit]: https://github.com/eyulf/homelab-infrastructure/tree/cea99cac5fd1248f2bde2f65d53f29267cbf02e1/terraform
[pki-commit]:       https://github.com/eyulf/homelab-infrastructure/tree/cea99cac5fd1248f2bde2f65d53f29267cbf02e1/k8s-pki
[ansible-commit]:   https://github.com/eyulf/homelab-infrastructure/tree/cea99cac5fd1248f2bde2f65d53f29267cbf02e1/ansible

[terraform-tfvars]:    https://github.com/eyulf/homelab-infrastructure/tree/cea99cac5fd1248f2bde2f65d53f29267cbf02e1/terraform/infrastructure/kubernetes/terraform.tfvars.enc
[all-yml]:     https://github.com/eyulf/homelab-infrastructure/tree/cea99cac5fd1248f2bde2f65d53f29267cbf02e1/ansible/group_vars/all.yml.enc
[k8s_controllers-yml]: https://github.com/eyulf/homelab-infrastructure/tree/cea99cac5fd1248f2bde2f65d53f29267cbf02e1/ansible/group_vars/k8s_controllers.yml.enc
