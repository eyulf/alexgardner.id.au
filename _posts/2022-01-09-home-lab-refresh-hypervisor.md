---
layout: post
title: "Home-Lab Refresh: Hypervisors"
date: 2022-01-09 15:24 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-hypervisor
---

In the next step of my [Homelab Refresh][homelab-refresh], the Hardware neeeded to have an OS installed. I've normally used CentOS as my go-to server OS, however, following the [death of CentOS 8][centos-8-death], I thought I'd try my hand with Debian.

## Debian

I installed Debian manually off a USB on each node, setting up the bare minimum needed to SSH into a uniquely named host. For actual server configuration work, I used Ansible to configure the hosts as KVM hypervisors.

Since there is currently no DNS server configured as part of this refresh, the KVM hypervisors are addressed directly by IPs, the IP addresses themselves are assigned via a DHCP server running on my Mikrotik router.

## Ansible

I've settled on using Ansible to perform the majority of the configuration for the non transiant servers within the refreshed Homelab, Hypervisors included. I've published the [intial Ansible configuration][ansible-commit] that I used to setup KVM on these hosts. With this config, setting up a new SSH ready KVM node was quite easy.

```
$ ansible-playbook kvm-hypervisors.yml -i production -l kvm3

PLAY [kvm_hypervisors] ************************************************************************************************

TASK [Gathering Facts] ************************************************************************************************
[WARNING]: Platform linux on host kvm3 is using the discovered Python interpreter at /usr/bin/python, but future
installation of another Python interpreter could change this. See
https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information.
ok: [kvm3]

TASK [common : main | set variables] **********************************************************************************
ok: [kvm3] => (item=homelab-infrastructure/ansible/roles/common/vars/Debian.yml)

TASK [common : network | update hostname] *****************************************************************************
skipping: [kvm3]

TASK [common : network | update /etc/resolv.conf] *********************************************************************
changed: [kvm3]

TASK [common : network | update /etc/hosts] ***************************************************************************
changed: [kvm3]

TASK [common : firewall] **********************************************************************************************
included: homelab-infrastructure/ansible/roles/common/tasks/firewall-Debian.yml for kvm3

TASK [common : firewall | install ufw package] ************************************************************************
[WARNING]: Updating cache and auto-installing missing dependency: python-apt
changed: [kvm3]

TASK [common : firewall | allow ssh inbound from clients] *************************************************************
changed: [kvm3]

TASK [common : firewall | set outbound default] ***********************************************************************
ok: [kvm3]

TASK [common : firewall | set inbound default] ************************************************************************
ok: [kvm3]

TASK [common : firewall | enable firewall] ****************************************************************************
changed: [kvm3]

TASK [common : ntp | update timezone] *********************************************************************************
ok: [kvm3]

TASK [common : ntp | intall ntp package] ******************************************************************************
changed: [kvm3]

TASK [common : ntp | configure ntp] ***********************************************************************************
ok: [kvm3]

TASK [common : ntp | start and enable ntp service] ********************************************************************
ok: [kvm3]

TASK [packages | install common packages] *****************************************************************************
changed: [kvm3] => (item=htop)
ok: [kvm3] => (item=lsof)
changed: [kvm3] => (item=net-tools)
changed: [kvm3] => (item=screen)
changed: [kvm3] => (item=strace)
ok: [kvm3] => (item=telnet)
changed: [kvm3] => (item=vim)
ok: [kvm3] => (item=gpg)
changed: [kvm3] => (item=rsync)
changed: [kvm3] => (item=arping)

TASK [common : packages | enable additional repos] ********************************************************************
changed: [kvm3]

TASK [common : auto-updates] ******************************************************************************************
included: homelab-infrastructure/ansible/roles/common/tasks/auto-update-Debian.yml for kvm3

TASK [common : auto-updates | install unattended-upgrades package] ****************************************************
changed: [kvm3]

TASK [common : auto-updates | configure 20auto-upgrades] **************************************************************
changed: [kvm3]

TASK [common : auto-updates | configure 50unattended-upgrades] ********************************************************
changed: [kvm3]

TASK [common : auto-updates | enable unattended-upgrades service] *****************************************************
ok: [kvm3]

TASK [common : users | create admin users] ****************************************************************************
ok: [kvm3] => (item=adminuser)

TASK [common : sudo | install sudo package] ***************************************************************************
changed: [kvm3]

TASK [common : sudo | ensure admin users added to sudoers] ************************************************************
changed: [kvm3]

TASK [hardware : main | set variables] ********************************************************************************
ok: [kvm3] => (item=homelab-infrastructure/ansible/roles/hardware/vars/default.yml)

TASK [hardware : main | enable coretemp] ******************************************************************************
skipping: [kvm3]

TASK [packages | install hardware packages] ***************************************************************************
changed: [kvm3] => (item=intel-microcode)
changed: [kvm3] => (item=lm-sensors)
changed: [kvm3] => (item=sg3-utils)
changed: [kvm3] => (item=smartmontools)

TASK [kvm_hypervisor : main | set variables] **************************************************************************
ok: [kvm3] => (item=homelab-infrastructure/ansible/roles/kvm_hypervisor/vars/default.yml)

TASK [kvm_hypervisor : network | install networking packages] *********************************************************
changed: [kvm3] => (item=bridge-utils)

TASK [kvm_hypervisor : network | configure main interfaces file] ******************************************************
changed: [kvm3]

TASK [kvm_hypervisor : network | configure 'br0' interface file] ******************************************************
changed: [kvm3]

TASK [kvm_hypervisor : kvm | install KVM and QEMU packages] ***********************************************************
changed: [kvm3] => (item=qemu)
changed: [kvm3] => (item=qemu-kvm)
changed: [kvm3] => (item=qemu-system)
ok: [kvm3] => (item=qemu-utils)

TASK [kvm_hypervisor : kvm | install LibVirt packages] ****************************************************************
changed: [kvm3] => (item=libvirt-clients)
changed: [kvm3] => (item=libvirt-daemon-system)
changed: [kvm3] => (item=virtinst)

TASK [kvm_hypervisor : kvm | start service 'libvirtd'] ****************************************************************
ok: [kvm3]

TASK [kvm_hypervisor : kvm | configure AppArmour for 'qemu'] **********************************************************
changed: [kvm3]

RUNNING HANDLER [common : auto-updates | restart unattended-upgrades service] *****************************************
changed: [kvm3]

PLAY RECAP ************************************************************************************************************
kvm3                       : ok=35   changed=21   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0
```

Once the ansible playbook was run, the Hypervisors are _almost_ ready to run VMs.

## Terraform

The final KVM configuration steps are perform by Terraform. Since Terraform is being used to provision the VMs, it is ocnvinient to have Terraform perform the final tweaks for KVM to be usable, configuring the KVM pool, network and OS images.

This allows Terraform to have easy access to these relevent bits of configuration when provisioning VMs. 've published the [intial Terraform configuration][terraform-commit] that I used, there is also a custom Terraform module to create the VMs, however this is not currently being used.

```
$ terraform1.1 plan
libvirt_pool.kvm1: Refreshing state... [id=c68092b3-19f5-4f3b-b8d2-b1cd09ceee13]
libvirt_network.kvm1: Refreshing state... [id=873acc52-5d6f-436d-b066-117171349b7a]
libvirt_volume.kvm1_os_images["debian_10"]: Refreshing state... [id=/var/lib/libvirt/images/debian-10.qcow2]
libvirt_volume.kvm1_os_images["centos_7"]: Refreshing state... [id=/var/lib/libvirt/images/centos-7.qcow2]
libvirt_pool.kvm2: Refreshing state... [id=d4ab806c-1052-4970-b71c-90ef1e7a3337]
libvirt_network.kvm2: Refreshing state... [id=b7db98a6-15f2-4de5-b303-25b97575901b]
libvirt_volume.kvm2_os_images["centos_7"]: Refreshing state... [id=/var/lib/libvirt/images/centos-7.qcow2]
libvirt_volume.kvm2_os_images["debian_10"]: Refreshing state... [id=/var/lib/libvirt/images/debian-10.qcow2]
libvirt_pool.kvm3: Refreshing state... [id=ff2b87cf-09ec-4a5f-a86b-5fb3adb40ed2]
libvirt_network.kvm3: Refreshing state... [id=1d72216a-6498-46f5-ab83-883ba6a06d4e]
libvirt_volume.kvm3_os_images["centos_7"]: Refreshing state... [id=/var/lib/libvirt/images/centos-7.qcow2]
libvirt_volume.kvm3_os_images["debian_10"]: Refreshing state... [id=/var/lib/libvirt/images/debian-10.qcow2]

No changes. Your infrastructure matches the configuration.

Terraform has compared your real infrastructure against your configuration and found no differences, so no changes are needed.
```

[homelab-refresh]:  {% link _posts/2022-01-07-home-lab-refresh.md %}
[centos-8-death]: https://arstechnica.com/gadgets/2020/12/centos-shifts-from-red-hat-unbranded-to-red-hat-beta/
[ansible-commit]: https://github.com/eyulf/homelab-infrastructure/tree/6c2a5630bc11e927b8dcbde62a261c4e9ee52142/ansible
[terraform-commit]: https://github.com/eyulf/homelab-infrastructure/tree/6c2a5630bc11e927b8dcbde62a261c4e9ee52142/terraform
