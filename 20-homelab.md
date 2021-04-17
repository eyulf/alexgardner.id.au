---
layout: page_stats
featured: true
title: Homelab
description: I maintain a physical homelab which I use to learn new technology.
permalink: /homelab/
published: true
image: titleimages/homelab

image_row:
  - title: Homelab Servers
    name: homelabv4-main
  - title: Network Map
    name: map
  - title: Power Usage
    name: power

stats:
  - name: Homelab Established
    value: "{{ site.data.misc.year_started.homelab }}"
  - name: Homelab Overhauls
    value: "{{ site.data.misc.stats.homelab.overhauls }}"
---

A homelab (in the context of IT) is a learning environment at home for IT equipment and systems that can be experimented with safely. This can provide useful experience with technology that you might not otherwise be able to get in your current role and can provide personal growth as well as allowing you to run personal projects at home or even as a hobby in it's own right.

In {{ site.data.misc.year_started.homelab }} I established a homelab primarily to help with my goal at the time of building my knowledge and skills to be able to move into a Systems Administration role which I met in {{ site.data.misc.year_started.sysadmin }}. The long term goal at the moment is to provide an environment that is at least semi-autonomous in maintaining itself. I currently use this primarily for running some home services, most notably being my personal data storage, but still use this for learning and experimenting with new technologies.

My homelab uses, on average, about 90 watts of power (~2.16 kWh/day) which is quite reasonable given the costs of electricity in Australia. The majority of the homelab's noise is produced by NAS and only on about the same level as my PC. My homelab consists of the following hardware:

* 1x Mikrotik CRS109-8G-1S-2HnD-IN Router

* 1x CyberPower UPS PR750ELCD

* 3x ThinkCentre M900 Tiny (USFF)
  * 32GB DDR4 RAM
  * 1TB SSD

* 1x Whitebox NAS
  * U-NAS NSC-810A Server Chassis
  * Seasonic SS-350M1U Mini 1U PSU
  * Supermicro X10SLM-F Motherboard
  * Intel Core i3-4170 3.7Ghz CPU
  * 16GB ECC DDR3 RAM
  * 6x 3TB WD Red HDD (RAID-Z3)
  * 120GB SSD (OS)

I am currently using the M900's as KVM Hypervisors. They are running a few PowerDNS servers which are backed by a MariaDB cluster that will be used as an external DNS provider for a Kubernetes cluster that will form the core part of my homelab. DHCP and some DNS is provided by the Mikrotik router. The VMs running on the hypervisors are deployed using Terraform, and the configuration for the VMs is made using Ansible.

Previous iterations of my homelab hardware and configuration have been sporadically covered in my blog:

{% for post in site.categories.Homelab -%}
* [{{ post.title }}]({{ post.url | relative_url }}) ({{ post.date | date: "%B %Y" }})
{% endfor %}

Once I've setup Kubernetes on these, future blog posts may cover my experiences in setting up and configuring Kubernetes using Terraform and Ansible, as well as some practical usage examples.

{% include images.html %}
