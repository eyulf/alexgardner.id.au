---
layout: page
title: Homelab
description: I maintain a home-lab setup which I use to practise my sysadmin skills.
permalink: /homelab/
published: true
---

The long term goal of this at the moment is to create an enviroment that is at least semi-autonomous in maintaining itself. I currently use this for learning and experimenting with ideas, concepts and technologies.

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

<section>
    <div class="box alt">
        <div class="row uniform 50%">
            <div class="4u">
                <span class="image fit">
                    <a data-lightbox="homelab" data-title="Homelab Servers" href="/assets/images/homelab/closeup.jpg">
                        <img src="/assets/images/homelab/closeup-thumb.jpg" alt="Homelab Servers" />
                    </a>
                </span>
            </div>
            <div class="4u">
                <span class="image fit">
                    <a data-lightbox="homelab" data-title="Network Map" href="/assets/images/homelab/map.png">
                        <img src="/assets/images/homelab/map-thumb.png" alt="Network Map" />
                    </a>
                </span>
            </div>
            <div class="4u">
                <span class="image fit">
                    <a data-lightbox="homelab" data-title="Power Usage" href="/assets/images/homelab/power.jpg">
                        <img src="/assets/images/homelab/power-thumb.jpg" alt="Power Usage" />
                    </a>
                </span>
            </div>
        </div>
    </div>
</section>

<div class="table-wrapper">
<table class="table-centre">
  <thread>
    <tr>
      <th><h4>Years Homelab-ing</h4></th>
      <th><h4>Homelab Overhauls</h4></th>
      <th><h4>Lines of Config Management Code</h4></th>
    </tr>
  </thread>
  <tr>
    <td><strong>{{ site.time | date: '%Y' | minus: site.year_start_homelab }}+</strong></td>
    <td><strong>{{ site.homelab_overhauls }}</strong></td>
    <td><strong>{{ site.homelab_lines }}</strong></td>
  </tr>
</table>
</div>
