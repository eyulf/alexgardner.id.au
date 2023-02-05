---
layout: post
title: "Home-Lab Part 3"
date: 2017-05-21 15:18 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab3
---

I've recently changed my homelab's physical setup and ditched the Rack. There have been several major changes since my last [post][homelab-part2]. The main driving force for the move away from the rack was to save on physical space as I do not have much of it in my home. The current setup fits in half of my TV unit, taking minimal space, and making minimal noise. This is ideal and is very partner-friendly.

{% include blog_image.html image="lab3" format="jpg" alt="My current Home-Lab" %}

Some time ago, the QNAP NAS's PUS failed, and this was the final nail in the coffin as I had been getting random reboots when using it, as well as performance issues. I replaced this with a white box NAS, built using off the shelf parts, this was done to ensure that any hardware faults are easy to resolve without being reliant on the vendor. Its current specs are listed below.

* U-NAS NSC-810A Server Chassis
* Seasonic SS-350M1U Mini 1U PSU
* Supermicro X10SLM-F Motherboard
* Intel Core i3-4170 3.7Ghz CPU
* 16GB ECC DDR3 RAM
* 8x 3TB WD Red HDDs
* 120GB SSD (OS)

I initially set it up as a single node Ceph machine, however, I have since re-provisioned it using FreeNAS as I was getting sub-par performance. The flexibility of adding hard drives was what made me use Ceph to start with, however since reviewing my current storage needs, I am satisfied with the inflexibility that ZFS brings to the table.

I now have a NUC running as the Hypervisor, using KVM instead of OpenVZ Containers. The NUC is running a minimal install of Centos 7, and I use Virtual Machine Manager on my Fedora workstation if I need GUI access. The move from Containers to proper VMs prompted the requirement for more resources which is why the specs are significantly better than the old Microserver I was using. I've also used this to create a lab environment for my RHCSA study. The NUC's specs are listed below.

* Intel NUC 6i5SYH
* 32GB DDR4 RAM
* 480GB SSD

I've also replaced the switch and router. In the case of the router I simply upgraded to a newer desktop size Mikrotik router with integral wireless, this allowed me to consolidate 2 devices into 1 which is critical for space reduction. This allowed me to effortlessly transfer the router config over and minimise disruption. The current devices are listed below.

* Mikrotik CRS109-8G-1S-2HnD-IN Router
* Cisco SG300-10 Managed Switch

The UPS was replaced with a newer, lower-spec model (CyberPower UPS PR750ELCD) that is approximately 1/5th the physical size of my previous one. Because the lab was barely putting any strain on the old UPS, I was able to significantly reduce the Power Rating requirement. The lab still only puts a small amount of load on the UPS, sitting at around 90-100 watts of usage. Given the constant increase in power costs over here, this was a good outcome.

[homelab-part2]: {% link _posts/2014-03-13-home-lab-part-2.md %}
