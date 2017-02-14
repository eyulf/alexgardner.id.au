---
layout: page
title: Homelab
description: I maintain a home-lab setup which I use to practise my sysadmin skills.
permalink: /homelab/
---
The long term goal of this at the moment is to create an enviroment that is at least semi-autonomous in maintaining itself. I currently use this for learning and experimenting with ideas, concepts and technologies.

Currently my lab is using ~90 watts power (~2.16 kWh/day). The lab consists of the following hardware:


* HP Proliant N36L Microserver (8GB RAM, 1 TB HDD)
* Qnap TS-410 NAS (4x 2 TB HDD in RAID 5)
* Mikrotik RB2011UAS Router
* Microtik Wireless Router
* TPlink TL-SG3216 switch
* CyberPower UPS PR1500ELCDRTXL2U


I am using the Microserver as my main VM hypervisor. It is being used to run various services including DNS, DHCP, Monitoring, Log collection and Configuration Management.

<section>
	<div class="box alt">
		<div class="row uniform 50%">
			<div class="4u"><span class="image fit"><a class="fancybox" rel="homelab" href="/assets/images/homelab/closeup.jpg"><img src="/assets/images/homelab/closeup-thumb.jpg" alt="" /></a></span></div>
			<div class="4u"><span class="image fit"><a class="fancybox" rel="homelab" href="/assets/images/homelab/map.png"><img src="/assets/images/homelab/map-thumb.png" alt="" /></a></span></div>
			<div class="4u"><span class="image fit"><a class="fancybox" rel="homelab" href="/assets/images/homelab/power.jpg"><img src="/assets/images/homelab/power-thumb.jpg" alt="" /></a></span></div>
		</div>
	</div>
</section>

<script type="text/javascript">
	$(document).ready(function() {
		$(".fancybox").fancybox();
	});
</script>
