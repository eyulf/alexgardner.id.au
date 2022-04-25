---
layout: post
title: "Home-Lab Refresh: DNS"
date: 2022-01-13 07:45 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-dns
---

Following setting up the [KVM Hypervisors][homelab-kvm] for my [Homelab Refresh][homelab-refresh], the next step was to add DNS. I settled on using PowerDNS for several reasons.

1. [It has an external API][pdns-api].
1. [Kubernetes can use it as external DNS][k8s-ext-dns].
1. I am already familiar with it through work.

To make PowerDNS work effectively, A MariaDB Galera cluster will be set-up to act as the database backend to PowerDNS. No GUI is required for PowerDNS so this will be ignored.

While this could be setup inside a Kubernetes cluster, I am electing to keep these separate and outside of Kubernetes. This maintains a healthy separation of failure domains between DNS and Kubernetes, meaning that a failure of one will not impact the other. This is ideal in the event that Kubernetes experiences issues, as troubleshooting will not then complicated by DNS potentially being down. In the event that the DNS servers are experiencing issues, there is no need to touch the Kubernetes side.

Setting this up has a few steps:

1. [Terraform](#terraform)
1. [Ansible - Node 1](#ansible---node-1)
1. [Manually Bootstrap Galera](#manually-bootstrap-galera)
1. [Ansible - Remaining Nodes](#ansible---remaining-nodes)
1. [PowerDNS](#powerdns)

## Terraform

The first step for deploying the DNS servers is to provision them using the Terraform I previously made. This is fairly straight forward and is done using a new directory so that the Terraform state is separated. I've published the [Terraform configuration][terraform-commit] that I've used for deploying the DNS servers.

### Variables

terraform/infrastructure/core_services/[terraform.tfvars][terraform-tfvars]
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
  "dns1" = {
    "ip"   = "10.1.1.31",
    "os"   = "debian_10"
  },
  "dns2" = {
    "ip"   = "10.1.1.32",
    "os"   = "debian_10"
  },
  "dns3" = {
    "ip"   = "10.1.1.33",
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
cd terraform/infrastructure/core_services
terraform1.1 apply
```

<div class="blog_post_output hidden">

<h3 id="output">Output</h3>
<p>(Click to show/hide the output)</p>
<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>[user@workstation core_services]$ terraform1.1 apply

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with
the following symbols:
  + create

Terraform will perform the following actions:

  # random_password.dns1 will be created
  + resource "random_password" "dns1" {
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

  # random_password.dns2 will be created
  + resource "random_password" "dns2" {
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

  # random_password.dns3 will be created
  + resource "random_password" "dns3" {
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

  # module.dns1.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "dns1.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.1/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.1 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.dns1.libvirt_domain.main will be created
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
      + name        = "dns1.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 1

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
          + hostname     = "dns1.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.dns1.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "dns1.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

  # module.dns2.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "dns2.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.2/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.1 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.dns2.libvirt_domain.main will be created
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
      + name        = "dns2.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 1

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
          + hostname     = "dns2.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.dns2.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "dns2.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

  # module.dns3.libvirt_cloudinit_disk.cloudinit will be created
  + resource "libvirt_cloudinit_disk" "cloudinit" {
      + id             = (known after apply)
      + name           = "dns3.lab.alexgardner.id.au-cloudinit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                 dhcp4: false
                 addresses: [ 10.1.1.3/24 ]
                 gateway4: 10.1.1.1
                 nameservers:
                   addresses: [ 10.1.1.1 ]
                   search: [ lab.alexgardner.id.au ]
        EOT
      + pool           = "default"
      + user_data      = (sensitive)
    }

  # module.dns3.libvirt_domain.main will be created
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
      + name        = "dns3.lab.alexgardner.id.au"
      + qemu_agent  = false
      + running     = true
      + vcpu        = 1

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
          + hostname     = "dns3.lab.alexgardner.id.au"
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = (known after apply)
        }
    }

  # module.dns3.libvirt_volume.main will be created
  + resource "libvirt_volume" "main" {
      + base_volume_id = "/var/lib/libvirt/images/debian-10.qcow2"
      + format         = (known after apply)
      + id             = (known after apply)
      + name           = "dns3.lab.alexgardner.id.au.qcow2"
      + pool           = "default"
      + size           = 21474826240
    }

Plan: 12 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

module.dns1.libvirt_volume.main: Creating...
random_password.dns2: Creating...
random_password.dns1: Creating...
random_password.dns3: Creating...
random_password.dns2: Creation complete after 0s [id=none]
random_password.dns1: Creation complete after 0s [id=none]
random_password.dns3: Creation complete after 0s [id=none]
module.dns1.libvirt_cloudinit_disk.cloudinit: Creating...
module.dns1.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/dns1.lab.alexgardner.id.au.qcow2]
module.dns3.libvirt_volume.main: Creating...
module.dns3.libvirt_cloudinit_disk.cloudinit: Creating...
module.dns1.libvirt_cloudinit_disk.cloudinit: Creation complete after 0s [id=/var/lib/libvirt/images/dns1.lab.alexgardner.id.au-cloudinit.iso;5832db3f-7064-444a-b737-e64408a4abda]
module.dns1.libvirt_domain.main: Creating...
module.dns2.libvirt_cloudinit_disk.cloudinit: Creating...
module.dns2.libvirt_volume.main: Creating...
module.dns3.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/dns3.lab.alexgardner.id.au.qcow2]
module.dns2.libvirt_volume.main: Creation complete after 0s [id=/var/lib/libvirt/images/dns2.lab.alexgardner.id.au.qcow2]
module.dns3.libvirt_cloudinit_disk.cloudinit: Creation complete after 0s [id=/var/lib/libvirt/images/dns3.lab.alexgardner.id.au-cloudinit.iso;d277b787-a506-4990-965d-c402237c73f7]
module.dns3.libvirt_domain.main: Creating...
module.dns2.libvirt_cloudinit_disk.cloudinit: Creation complete after 0s [id=/var/lib/libvirt/images/dns2.lab.alexgardner.id.au-cloudinit.iso;cd84c59f-47dc-45c5-99c6-144573811a3b]
module.dns2.libvirt_domain.main: Creating...
module.dns1.libvirt_domain.main: Creation complete after 1s [id=0b0737a8-7bf3-4b0b-8482-d6b1fe8d4a4d]
module.dns3.libvirt_domain.main: Creation complete after 1s [id=6c78f86b-efc3-42e3-83ea-593099b00e18]
module.dns2.libvirt_domain.main: Creation complete after 1s [id=650d5c0a-cb0e-41aa-8846-92f06c8552e6]

Apply complete! Resources: 12 added, 0 changed, 0 destroyed.
</code></pre></div></div>
</div>

## Ansible - Node 1

The next step is to run Ansible on the node selected to bootstrap the Galera cluster. I've published the [Ansible configuration][ansible-commit] that I used to do this. This initial run also creates the PowerDNS database in MariaDB and imports the database schema.

### Variables

ansible/group_vars/[all.yml][all-yml]
```
---
domain: lab.alexgardner.id.au
email: alex+homelab@alexgardner.id.au

nameservers:
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

ansible/group_vars/[dns_servers.yml][dns_servers-yml]
```
---
debian_version: buster
mariadb_version: mariadb-10.5
mariadb_root_password: MySuperSecretPassword
#checkov:skip=CKV_SECRET_6:Unencrypted secrets are git-ignored

mariadb_galera_auth_user: mariabackup
mariadb_galera_auth_password: MySuperSecretPassword
#checkov:skip=CKV_SECRET_6:Unencrypted secrets are git-ignored
mariadb_galera_bootstrap_host: dns1
mariadb_galera_hosts_list:
  - '10.1.1.31'
  - '10.1.1.32'
  - '10.1.1.33'

powerdns_version: '45'
powerdns_mysql_password: MySuperSecretPassword
#checkov:skip=CKV_SECRET_6:Unencrypted secrets are git-ignored
powerdns_forward_recursors: 10.1.1.1;1.0.0.1;1.1.1.1
powerdns_foward_zones:
  - 'lab.alexgardner.id.au'
  - '1.1.10.in-addr.arpa'
```

### Commands
```
cd ansible
ansible-playbook -i production dns-servers.yml -l dns1
```

<div class="blog_post_output hidden">

<h3 id="output">Output</h3>
<p>(Click to show/hide the output)</p>
<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>[user@workstation ansible]$ ansible-playbook -i production dns-servers.yml -l dns1

PLAY [dns_servers] ****************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
[WARNING]: Platform linux on host dns1 is using the discovered Python interpreter at /usr/bin/python3.7, but future
installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [dns1]

TASK [common : main | set variables] **********************************************************************************
ok: [dns1] => (item=homelab-infrastructure/ansible/roles/common/vars/Debian.yml)

TASK [common : network | update hostname] *****************************************************************************
changed: [dns1]

TASK [common : network | update /etc/resolv.conf] *********************************************************************
changed: [dns1]

TASK [common : network | update /etc/hosts] ***************************************************************************
changed: [dns1]

TASK [common : firewall] **********************************************************************************************
included: homelab-infrastructure/ansible/roles/common/tasks/firewall-Debian.yml for dns1

TASK [common : firewall | install ufw package] ************************************************************************
changed: [dns1]

TASK [common : firewall | allow ssh inbound from clients] *************************************************************
changed: [dns1]

TASK [common : firewall | set outbound default] ***********************************************************************
ok: [dns1]

TASK [common : firewall | set inbound default] ************************************************************************
ok: [dns1]

TASK [common : firewall | enable firewall] ****************************************************************************
changed: [dns1]

TASK [common : ntp | update timezone] *********************************************************************************
changed: [dns1]

TASK [common : ntp | intall ntp package] ******************************************************************************
changed: [dns1]

TASK [common : ntp | configure ntp] ***********************************************************************************
ok: [dns1]

TASK [common : ntp | start and enable ntp service] ********************************************************************
ok: [dns1]

TASK [packages | install common packages] *****************************************************************************
changed: [dns1] => (item=htop)
changed: [dns1] => (item=lsof)
ok: [dns1] => (item=net-tools)
ok: [dns1] => (item=screen)
changed: [dns1] => (item=strace)
changed: [dns1] => (item=telnet)
ok: [dns1] => (item=vim)
changed: [dns1] => (item=gpg)
changed: [dns1] => (item=rsync)
changed: [dns1] => (item=arping)
changed: [dns1] => (item=dnsutils)

TASK [common : packages | enable additional repos] ********************************************************************
changed: [dns1]

TASK [common : auto-updates] ******************************************************************************************
included: homelab-infrastructure/ansible/roles/common/tasks/auto-update-Debian.yml for dns1

TASK [common : auto-updates | install unattended-upgrades package] ****************************************************
ok: [dns1]

TASK [common : auto-updates | configure 20auto-upgrades] **************************************************************
changed: [dns1]

TASK [common : auto-updates | configure 50unattended-upgrades] ********************************************************
changed: [dns1]

TASK [common : auto-updates | enable unattended-upgrades service] *****************************************************
ok: [dns1]

TASK [common : users | create admin users] ****************************************************************************
changed: [dns1] => (item=adminuser)

TASK [common : sudo | install sudo package] ***************************************************************************
ok: [dns1]

TASK [common : sudo | ensure admin users added to sudoers] ************************************************************
changed: [dns1]

TASK [db_server : database | set variables] ***************************************************************************
ok: [dns1] => (item=homelab-infrastructure/ansible/roles/db_server/vars/default.yml)

TASK [db_server : database | install mariadb key] *********************************************************************
changed: [dns1]

TASK [db_server : database | add mariadb repo] ************************************************************************
changed: [dns1]

TASK [db_server : database | install mariadb packages] ****************************************************************
changed: [dns1] => (item=python-pymysql)
changed: [dns1] => (item=python3-pymysql)
changed: [dns1] => (item=mariadb-server)
changed: [dns1] => (item=mariadb-client)
changed: [dns1] => (item=mariadb-backup)
ok: [dns1] => (item=galera-4)
ok: [dns1] => (item=socat)

TASK [db_server : database | allow mariadb inbound from network] ******************************************************
skipping: [dns1]

TASK [db_server : database | allow galera inbound from mariadb servers] ***********************************************
changed: [dns1] => (item=['4444', '10.1.1.31'])
changed: [dns1] => (item=['4444', '10.1.1.32'])
changed: [dns1] => (item=['4444', '10.1.1.33'])
changed: [dns1] => (item=['4567', '10.1.1.31'])
changed: [dns1] => (item=['4567', '10.1.1.32'])
changed: [dns1] => (item=['4567', '10.1.1.33'])
changed: [dns1] => (item=['4568', '10.1.1.31'])
changed: [dns1] => (item=['4568', '10.1.1.32'])
changed: [dns1] => (item=['4568', '10.1.1.33'])

TASK [db_server : database | configure /etc/mysql/mariadb.conf.d/60-galera.cnf] ***************************************
changed: [dns1]

TASK [db_server : database | enable and start mariadb service] ********************************************************
ok: [dns1]

TASK [db_server : database | create replication user] *****************************************************************
changed: [dns1]

TASK [db_server : database-secure | change the root password] *********************************************************
changed: [dns1]

TASK [db_server : database-secure | write root password to /root/.my.cnf] *********************************************
changed: [dns1]

TASK [db_server : database-secure | remove anonymous users] ***********************************************************
ok: [dns1]

TASK [db_server : database-secure | remove test database] *************************************************************
ok: [dns1]

TASK [dns_server : main | set variables] ******************************************************************************
ok: [dns1] => (item=homelab-infrastructure/ansible/roles/dns_server/vars/default.yml)

TASK [dns_server : powerdns | install powerdns key] *******************************************************************
changed: [dns1]

TASK [dns_server : powerdns | add powerdns repo] **********************************************************************
changed: [dns1]

TASK [dns_server : powerdns | manage powerdns APT pinning] ************************************************************
changed: [dns1]

TASK [dns_server : powerdns | install powerdns packages] **************************************************************
changed: [dns1] => (item=pdns-server)
changed: [dns1] => (item=pdns-recursor)
changed: [dns1] => (item=pdns-backend-mysql)

TASK [dns_server : powerdns | remove unrequired powerdns packages] ****************************************************
changed: [dns1] => (item=pdns-backend-bind)

TASK [dns_server : powerdns | remove /etc/powerdns/pdns.d/bind.conf] **************************************************
changed: [dns1]

TASK [dns_server : powerdns | ensure database created] ****************************************************************
changed: [dns1]

TASK [dns_server : powerdns | ensure database user created] ***********************************************************
changed: [dns1]

TASK [dns_server : powerdns | configure /etc/powerdns/pdns.d/mysql.conf] **********************************************
changed: [dns1]

TASK [dns_server : powerdns | configure /etc/powerdns/pdns.d/pdns.conf] ***********************************************
changed: [dns1]

TASK [dns_server : powerdns | enable and start powerdns service] ******************************************************
ok: [dns1]

TASK [dns_server : powerdns | configure /etc/powerdns/recursor.d/recursor.conf] ***************************************
changed: [dns1]

TASK [dns_server : powerdns | enable and start powerdns recursor service] *********************************************
ok: [dns1]

TASK [dns_server : powerdns | allow powerdns inbound from servers and clients] ****************************************
changed: [dns1] => (item=10.1.1.0/24)
changed: [dns1] => (item=10.1.2.0/24)
changed: [dns1] => (item=10.1.3.0/24)

RUNNING HANDLER [common : auto-updates | restart unattended-upgrades service] *****************************************
changed: [dns1]

RUNNING HANDLER [db_server : database | restart mariadb] **************************************************************
skipping: [dns1]

RUNNING HANDLER [dns_server : powerdns | import database schema] ******************************************************
changed: [dns1]

RUNNING HANDLER [dns_server : powerdns | restart powerdns] ************************************************************
changed: [dns1]

RUNNING HANDLER [dns_server : powerdns | restart powerdns-recursor] ***************************************************
changed: [dns1]

PLAY RECAP ************************************************************************************************************
dns1                       : ok=56   changed=38   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   
</code></pre></div></div>
</div>

## Manually Bootstrap Galera

Once Ansible has been run on the bootstrapping node, we then SSH into it and manually bootstrap the Galera cluster. This is manual because it reduces the complexity in having Ansible try to work out when the `galera_new_cluster` command should be run.  This could be achieved with Ansible, however, this is much easier and should only need to be run once per cluster. Perhaps if I have time I'll update Ansible to do it all.

```
adminuser@dns1:~$ sudo systemctl stop mariadb
adminuser@dns1:~$ sudo galera_new_cluster
adminuser@dns1:~$ sudo mysql -e "SHOW GLOBAL STATUS LIKE 'wsrep_cluster_s%';"
+--------------------------+--------------------------------------+
| Variable_name            | Value                                |
+--------------------------+--------------------------------------+
| wsrep_cluster_size       | 1                                    |
| wsrep_cluster_state_uuid | 4cc81535-738f-11ec-89ae-d2c65843490d |
| wsrep_cluster_status     | Primary                              |
+--------------------------+--------------------------------------+
```
## Ansible - Remaining nodes

Once Galera has been bootstrapped, Ansible can be run on the remaining hosts. Since the remaining hosts are not the bootstrap host, Ansible will restart MariaDB on them, which will bring them into the Galera cluster.

### Commands
```
cd ansible
ansible-playbook -i production dns-servers.yml
```

<div class="blog_post_output hidden">

<h3 id="output">Output</h3>
<p>(Click to show/hide the output)</p>
<div class="highlighter-rouge"><div class="highlight"><pre class="highlight"><code>[user@workstation ansible]$ ansible-playbook -i production dns-servers.yml

PLAY [dns_servers] ****************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
[WARNING]: Platform linux on host dns1 is using the discovered Python interpreter at /usr/bin/python, but future
installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [dns1]
[WARNING]: Platform linux on host dns2 is using the discovered Python interpreter at /usr/bin/python3.7, but future
installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [dns2]
[WARNING]: Platform linux on host dns3 is using the discovered Python interpreter at /usr/bin/python3.7, but future
installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [dns3]

TASK [common : main | set variables] **********************************************************************************
ok: [dns1] => (item=homelab-infrastructure/ansible/roles/common/vars/Debian.yml)
ok: [dns2] => (item=homelab-infrastructure/ansible/roles/common/vars/Debian.yml)
ok: [dns3] => (item=homelab-infrastructure/ansible/roles/common/vars/Debian.yml)

TASK [common : network | update hostname] *****************************************************************************
skipping: [dns1]
changed: [dns2]
changed: [dns3]

TASK [common : network | update /etc/resolv.conf] *********************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [common : network | update /etc/hosts] ***************************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [common : firewall] **********************************************************************************************
included: homelab-infrastructure/ansible/roles/common/tasks/firewall-Debian.yml for dns1, dns2, dns3

TASK [common : firewall | install ufw package] ************************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [common : firewall | allow ssh inbound from clients] *************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [common : firewall | set outbound default] ***********************************************************************
ok: [dns2]
ok: [dns3]
ok: [dns1]

TASK [common : firewall | set inbound default] ************************************************************************
ok: [dns2]
ok: [dns3]
ok: [dns1]

TASK [common : firewall | enable firewall] ****************************************************************************
ok: [dns1]
changed: [dns2]
changed: [dns3]

TASK [common : ntp | update timezone] *********************************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [common : ntp | intall ntp package] ******************************************************************************
ok: [dns1]
changed: [dns2]
changed: [dns3]

TASK [common : ntp | configure ntp] ***********************************************************************************
ok: [dns1]
ok: [dns2]
ok: [dns3]

TASK [common : ntp | start and enable ntp service] ********************************************************************
ok: [dns1]
ok: [dns3]
ok: [dns2]

TASK [packages | install common packages] *****************************************************************************
ok: [dns1] => (item=htop)
ok: [dns1] => (item=lsof)
ok: [dns1] => (item=net-tools)
changed: [dns2] => (item=htop)
changed: [dns3] => (item=htop)
ok: [dns1] => (item=screen)
ok: [dns1] => (item=strace)
ok: [dns1] => (item=telnet)
changed: [dns2] => (item=lsof)
changed: [dns3] => (item=lsof)
ok: [dns1] => (item=vim)
ok: [dns2] => (item=net-tools)
ok: [dns3] => (item=net-tools)
ok: [dns1] => (item=gpg)
ok: [dns2] => (item=screen)
ok: [dns3] => (item=screen)
ok: [dns1] => (item=rsync)
ok: [dns1] => (item=arping)
changed: [dns2] => (item=strace)
changed: [dns3] => (item=strace)
changed: [dns2] => (item=telnet)
ok: [dns2] => (item=vim)
changed: [dns3] => (item=telnet)
ok: [dns3] => (item=vim)
changed: [dns2] => (item=gpg)
changed: [dns3] => (item=gpg)
changed: [dns2] => (item=rsync)
changed: [dns3] => (item=rsync)
changed: [dns2] => (item=arping)
changed: [dns3] => (item=arping)
ok: [dns1] => (item=dnsutils)
changed: [dns3] => (item=dnsutils)
changed: [dns2] => (item=dnsutils)

TASK [common : packages | enable additional repos] ********************************************************************
ok: [dns1]
changed: [dns2]
changed: [dns3]

TASK [common : auto-updates] ******************************************************************************************
included: homelab-infrastructure/ansible/roles/common/tasks/auto-update-Debian.yml for dns1, dns2, dns3

TASK [common : auto-updates | install unattended-upgrades package] ****************************************************
ok: [dns1]
ok: [dns3]
ok: [dns2]

TASK [common : auto-updates | configure 20auto-upgrades] **************************************************************
ok: [dns1]
changed: [dns2]
changed: [dns3]

TASK [common : auto-updates | configure 50unattended-upgrades] ********************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [common : auto-updates | enable unattended-upgrades service] *****************************************************
ok: [dns1]
ok: [dns2]
ok: [dns3]

TASK [common : users | create admin users] ****************************************************************************
ok: [dns1] => (item=adminuser)
changed: [dns3] => (item=adminuser)
changed: [dns2] => (item=adminuser)

TASK [common : sudo | install sudo package] ***************************************************************************
ok: [dns1]
ok: [dns2]
ok: [dns3]

TASK [common : sudo | ensure admin users added to sudoers] ************************************************************
ok: [dns1]
changed: [dns2]
changed: [dns3]

TASK [db_server : database | set variables] ***************************************************************************
ok: [dns1] => (item=homelab-infrastructure/ansible/roles/db_server/vars/default.yml)
ok: [dns2] => (item=homelab-infrastructure/ansible/roles/db_server/vars/default.yml)
ok: [dns3] => (item=homelab-infrastructure/ansible/roles/db_server/vars/default.yml)

TASK [db_server : database | install mariadb key] *********************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [db_server : database | add mariadb repo] ************************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [db_server : database | install mariadb packages] ****************************************************************
ok: [dns1] => (item=python-pymysql)
ok: [dns1] => (item=python3-pymysql)
ok: [dns1] => (item=mariadb-server)
ok: [dns1] => (item=mariadb-client)
ok: [dns1] => (item=mariadb-backup)
ok: [dns1] => (item=galera-4)
ok: [dns1] => (item=socat)
changed: [dns3] => (item=python-pymysql)
changed: [dns2] => (item=python-pymysql)
changed: [dns3] => (item=python3-pymysql)
changed: [dns2] => (item=python3-pymysql)
changed: [dns3] => (item=mariadb-server)
changed: [dns2] => (item=mariadb-server)
changed: [dns3] => (item=mariadb-client)
changed: [dns2] => (item=mariadb-client)
changed: [dns3] => (item=mariadb-backup)
ok: [dns3] => (item=galera-4)
ok: [dns3] => (item=socat)
changed: [dns2] => (item=mariadb-backup)
ok: [dns2] => (item=galera-4)
ok: [dns2] => (item=socat)

TASK [db_server : database | allow mariadb inbound from network] ******************************************************
skipping: [dns1]
skipping: [dns2]
skipping: [dns3]

TASK [db_server : database | allow galera inbound from mariadb servers] ***********************************************
changed: [dns2] => (item=['4444', '10.1.1.31'])
changed: [dns3] => (item=['4444', '10.1.1.31'])
ok: [dns1] => (item=['4444', '10.1.1.31'])
changed: [dns2] => (item=['4444', '10.1.1.32'])
changed: [dns3] => (item=['4444', '10.1.1.32'])
ok: [dns1] => (item=['4444', '10.1.1.32'])
changed: [dns2] => (item=['4444', '10.1.1.33'])
ok: [dns1] => (item=['4444', '10.1.1.33'])
changed: [dns3] => (item=['4444', '10.1.1.33'])
ok: [dns1] => (item=['4567', '10.1.1.31'])
changed: [dns2] => (item=['4567', '10.1.1.31'])
changed: [dns3] => (item=['4567', '10.1.1.31'])
ok: [dns1] => (item=['4567', '10.1.1.32'])
changed: [dns2] => (item=['4567', '10.1.1.32'])
changed: [dns3] => (item=['4567', '10.1.1.32'])
ok: [dns1] => (item=['4567', '10.1.1.33'])
changed: [dns2] => (item=['4567', '10.1.1.33'])
changed: [dns3] => (item=['4567', '10.1.1.33'])
ok: [dns1] => (item=['4568', '10.1.1.31'])
changed: [dns2] => (item=['4568', '10.1.1.31'])
changed: [dns3] => (item=['4568', '10.1.1.31'])
ok: [dns1] => (item=['4568', '10.1.1.32'])
changed: [dns2] => (item=['4568', '10.1.1.32'])
changed: [dns3] => (item=['4568', '10.1.1.32'])
ok: [dns1] => (item=['4568', '10.1.1.33'])
changed: [dns2] => (item=['4568', '10.1.1.33'])
changed: [dns3] => (item=['4568', '10.1.1.33'])

TASK [db_server : database | configure /etc/mysql/mariadb.conf.d/60-galera.cnf] ***************************************
ok: [dns1]
changed: [dns2]
changed: [dns3]

TASK [db_server : database | enable and start mariadb service] ********************************************************
ok: [dns1]
ok: [dns2]
ok: [dns3]

TASK [db_server : database | create replication user] *****************************************************************
skipping: [dns2]
skipping: [dns3]
ok: [dns1]

TASK [db_server : database-secure | change the root password] *********************************************************
skipping: [dns2]
skipping: [dns3]
ok: [dns1]

TASK [db_server : database-secure | write root password to /root/.my.cnf] *********************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [db_server : database-secure | remove anonymous users] ***********************************************************
skipping: [dns2]
skipping: [dns3]
ok: [dns1]

TASK [db_server : database-secure | remove test database] *************************************************************
skipping: [dns2]
skipping: [dns3]
ok: [dns1]

TASK [dns_server : main | set variables] ******************************************************************************
ok: [dns1] => (item=homelab-infrastructure/ansible/roles/dns_server/vars/default.yml)
ok: [dns2] => (item=homelab-infrastructure/ansible/roles/dns_server/vars/default.yml)
ok: [dns3] => (item=homelab-infrastructure/ansible/roles/dns_server/vars/default.yml)

TASK [dns_server : powerdns | install powerdns key] *******************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [dns_server : powerdns | add powerdns repo] **********************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [dns_server : powerdns | manage powerdns APT pinning] ************************************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [dns_server : powerdns | install powerdns packages] **************************************************************
ok: [dns1] => (item=pdns-server)
ok: [dns1] => (item=pdns-recursor)
ok: [dns1] => (item=pdns-backend-mysql)
changed: [dns3] => (item=pdns-server)
changed: [dns2] => (item=pdns-server)
changed: [dns3] => (item=pdns-recursor)
changed: [dns2] => (item=pdns-recursor)
changed: [dns3] => (item=pdns-backend-mysql)
changed: [dns2] => (item=pdns-backend-mysql)

TASK [dns_server : powerdns | remove unrequired powerdns packages] ****************************************************
ok: [dns1] => (item=pdns-backend-bind)
changed: [dns3] => (item=pdns-backend-bind)
changed: [dns2] => (item=pdns-backend-bind)

TASK [dns_server : powerdns | remove /etc/powerdns/pdns.d/bind.conf] **************************************************
ok: [dns1]
changed: [dns2]
changed: [dns3]

TASK [dns_server : powerdns | ensure database created] ****************************************************************
skipping: [dns2]
skipping: [dns3]
ok: [dns1]

TASK [dns_server : powerdns | ensure database user created] ***********************************************************
skipping: [dns2]
skipping: [dns3]
ok: [dns1]

TASK [dns_server : powerdns | configure /etc/powerdns/pdns.d/mysql.conf] **********************************************
ok: [dns1]
changed: [dns2]
changed: [dns3]

TASK [dns_server : powerdns | configure /etc/powerdns/pdns.d/pdns.conf] ***********************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [dns_server : powerdns | enable and start powerdns service] ******************************************************
ok: [dns1]
ok: [dns2]
ok: [dns3]

TASK [dns_server : powerdns | configure /etc/powerdns/recursor.d/recursor.conf] ***************************************
ok: [dns1]
changed: [dns3]
changed: [dns2]

TASK [dns_server : powerdns | enable and start powerdns recursor service] *********************************************
ok: [dns1]
ok: [dns2]
ok: [dns3]

TASK [dns_server : powerdns | allow powerdns inbound from servers and clients] ****************************************
ok: [dns1] => (item=10.1.1.0/24)
changed: [dns3] => (item=10.1.1.0/24)
changed: [dns2] => (item=10.1.1.0/24)
ok: [dns1] => (item=10.1.2.0/24)
changed: [dns3] => (item=10.1.2.0/24)
changed: [dns2] => (item=10.1.2.0/24)
ok: [dns1] => (item=10.1.3.0/24)
changed: [dns3] => (item=10.1.3.0/24)
changed: [dns2] => (item=10.1.3.0/24)

RUNNING HANDLER [common : auto-updates | restart unattended-upgrades service] *****************************************
changed: [dns3]
changed: [dns2]

RUNNING HANDLER [db_server : database | restart mariadb] **************************************************************
changed: [dns3]
changed: [dns2]

RUNNING HANDLER [dns_server : powerdns | restart powerdns] ************************************************************
changed: [dns3]
changed: [dns2]

RUNNING HANDLER [dns_server : powerdns | restart powerdns-recursor] ***************************************************
changed: [dns3]
changed: [dns2]

PLAY RECAP ************************************************************************************************************
dns1                       : ok=51   changed=0    unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   
dns2                       : ok=50   changed=34   unreachable=0    failed=0    skipped=7    rescued=0    ignored=0   
dns3                       : ok=50   changed=34   unreachable=0    failed=0    skipped=7    rescued=0    ignored=0   
</code></pre></div></div>
</div>

Once Ansible is completed, confirm that the Galera cluster is healthy.

```
adminuser@dns1:~$ sudo mysql -e "SHOW GLOBAL STATUS LIKE 'wsrep_cluster_s%';"
+--------------------------+--------------------------------------+
| Variable_name            | Value                                |
+--------------------------+--------------------------------------+
| wsrep_cluster_size       | 3                                    |
| wsrep_cluster_state_uuid | 36acd23e-7393-11ec-8a4e-b60b353a9920 |
| wsrep_cluster_status     | Primary                              |
+--------------------------+--------------------------------------+
```

## PowerDNS

You should now be able to add DNS records to PowerDNS.

```
adminuser@dns1:~$ sudo pdnsutil list-all-zones
adminuser@dns1:~$ sudo pdnsutil create-zone lab.alexgardner.id.au
Creating empty zone 'lab.alexgardner.id.au'
adminuser@dns1:~$ sudo pdnsutil list-all-zones
lab.alexgardner.id.au
adminuser@dns1:~$ sudo pdnsutil add-record lab.alexgardner.id.au dns1 a 900 10.1.1.31
New rrset:
test.example.test. 900 IN A 10.1.1.31
adminuser@dns1:~$ dig dns1.lab.alexgardner.id.au @127.0.0.1

; <<>> DiG 9.11.5-P4-5.1+deb10u6-Debian <<>> dns1.lab.alexgardner.id.au @127.0.0.1
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 18539
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;dns1.lab.alexgardner.id.au. IN  A

;; ANSWER SECTION:
dns1.lab.alexgardner.id.au. 900  IN  A 10.1.1.31

;; Query time: 6 msec
;; SERVER: 127.0.0.1#53(127.0.0.1)
;; WHEN: Thu Jan 13 07:45:27 AEDT 2022
;; MSG SIZE  rcvd: 70
```

Next up: [Kubernetes Installation][homelab-refresh-k8s-install]

[homelab-kvm]:                 {% link _posts/2022-01-09-home-lab-refresh-hypervisor.md %}
[homelab-refresh]:             {% link _posts/2022-01-07-home-lab-refresh.md %}
[homelab-refresh-k8s-install]: {% link _posts/2022-01-22-home-lab-refresh-kubernetes-install.md %}

[pdns-api]:    https://doc.powerdns.com/authoritative/http-api/index.html
[k8s-ext-dns]: https://github.com/kubernetes-sigs/external-dns

[ansible-commit]:   https://github.com/eyulf/homelab-infrastructure/tree/080015ae25e9990a32d1da522206164374ff5061/ansible
[terraform-commit]: https://github.com/eyulf/homelab-infrastructure/tree/080015ae25e9990a32d1da522206164374ff5061/terraform

[terraform-tfvars]: https://github.com/eyulf/homelab-infrastructure/tree/080015ae25e9990a32d1da522206164374ff5061/terraform/infrastructure/core_services/terraform.tfvars.enc
[all-yml]:          https://github.com/eyulf/homelab-infrastructure/tree/080015ae25e9990a32d1da522206164374ff5061/ansible/group_vars/all.yml.enc
[dns_servers-yml]:  https://github.com/eyulf/homelab-infrastructure/tree/080015ae25e9990a32d1da522206164374ff5061/ansible/group_vars/dns_servers.yml.enc
