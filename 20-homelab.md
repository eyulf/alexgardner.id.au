---
layout: page_stats
featured: true
title: Homelab
description: I maintain a home-lab setup which I use to practise my skills.
permalink: /homelab/
published: true
image: titleimages/homelab

image_row:
  - title: Homelab Servers
    name: closeup
  - title: Network Map
    name: map
  - title: Power Usage
    name: power

stats:
  - name: Years Homelab-ing
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.homelab }}+"
  - name: Homelab Overhauls
    value: "{{ site.data.misc.stats.homelab.overhauls }}"
---

The long term goal of this at the moment is to create an environment that is at least semi-autonomous in maintaining itself. I currently use this for learning and experimenting with ideas, concepts and technologies.

Currently my lab is using ~90 watts power (~2.16 kWh/day). The lab consists of the following hardware:

* Mikrotik CRS109-8G-1S-2HnD-IN Router
* Cisco SG300-10 Managed Switch
* CyberPower UPS PR750ELCD
* Intel NUC 6i5SYH (32GB DDR4 RAM, 480GB SSD)
* Whitebox NAS
  * U-NAS NSC-810A Server Chassis
  * Seasonic SS-350M1U Mini 1U PSU
  * Supermicro X10SLM-F Motherboard
  * Intel Core i3-4170 3.7Ghz CPU
  * 16GB ECC DDR3 RAM
  * 6x 3TB WD Red HDD
  * 120GB SSD (OS)

I am using the Microserver as my main VM hypervisor. It is being used to run various services including DNS, DHCP, Monitoring, Log collection and Configuration Management.

{% include images.html %}
