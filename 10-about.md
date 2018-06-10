---
layout: page
title: About
description: I'm a Linux Systems Administrator based in Sydney.
permalink: /about/
published: true
image: /assets/images/titleimages/about.jpg
---

<div>
    <span class="image left">
        <img src="/assets/images/alex-gardner.jpg" alt="" />
        <p>Picture by <a href="{{ site.data.links.main.anthea }}">Anthea Wright</a>.</p>
    </span>

    <p>In mid 2014 I made a massive change to my life and moved interstate, away from my friends and family in Adelaide, to Sydney in order to further my career. Since then I have stepped up and moved from Technical Support to System Administration.</p>

    <p>I have over {{ site.time | date: '%Y' | minus: site.year_start_it }} years of IT experience in general, and have worked in the Hosting and Telecommunication industries. I run a personal <a href="/homelab">homelab</a> which I use to learn new things about technology and practise the art of automating almost everything.</p>

    <p>I value freedom and privacy, and support the priciples of Free and Open Source Software (FOSS). In my spare time I participate in <a href="/reenactment">archery</a> with the <a target="_blank" href="{{ site.data.links.main.mas }}">Medieval Archery Society</a>, and impose my will onto steel by <a href="/blacksmith">blacksmithing</a>.</p>

    <p>My preferred method of contact is through <a href="mailto:alex@alexgardner.id.au">email</a>, my <a href="/{{ site.data.links.main.gpgkey }}">GPG Key</a> is avaliable for encrypted communications. I also have a <a href="{{ site.data.links.main.linkedin }}">LinkedIn</a> page, but do not update it much.</p>
</div>

<div class="table-wrapper">
<table class="table-centre">
  <thread>
    <tr>
      <th><h4>Years in IT</h4></th>
      <th><h4>Years as a Sysadmin</h4></th>
    </tr>
  </thread>
  <tr>
    <td><strong>{{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }}+</strong></td>
    <td><strong>{{ site.time | date: '%Y' | minus: site.data.misc.year_started.sysadmin }}+</strong></td>
  </tr>
</table>
</div>
