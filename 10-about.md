---
layout: page_stats
featured: true
title: About
description: "I am a Cloud Solutions Engineer with over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }} years of experience in IT."
permalink: /about/
published: true
image: titleimages/about

image_side:
  direction: left
  path: alex-gardner
  alt: Alex Gardner
  attribution:
    name: Anthea Wright
    link: "{{ site.data.links.main.anthea }}"

certification_highlight:
  - cert: AWS CSAP
    link: "{{ site.data.links.certs.aws-sap }}"
    image: aws-sap

stats:
  - name: Years in IT
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }}+"
  - name: Years as a Sysadmin
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.sysadmin }}+"
  - name: Years in Cloud
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.cloud }}+"
---

{% include images.html %}

Professionally, I have over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }} years of IT experience in general and have worked in the Hosting and Telecommunication industries. I run a personal [homelab]({% link 20-homelab.md %}) which I use to practise and learn new things about technology.

In 2014 I made a massive change to my life and moved interstate, away from my family and friends in Adelaide, to Sydney in order to further my career. Since then I have worked in a number of roles covering Systems Administration and Systems Engineering.

In 2020 I started working professionally full-time with Cloud technology (AWS) following my employer's business transformation and a renewed focus on providing Managed Cloud Services. I currently work as a Cloud Solutions Engineer, specialising in AWS to build and manage AWS infrastructure to meet customer requirements.

Throughout my career, I have obtained multiple certifications to validate my skills and knowledge from various vendors including Hashicorp, Amazon and RedHat. My active certifications are listed on [Credly](https://www.credly.com/users/alex-gardner/badges?sort=-state_updated_at&page=1).

Outside of my professional life, I have been a [historical re-enactor]({% link 30-reenactment.md %}) for over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.reenactment }} years. In my spare time, I participate in archery with the [Medieval Archery Society]({{ site.data.links.main.mas }}), learn Historical European Martial Arts (HEMA) with [Stoccata]({{ site.data.links.main.stoccata }}), and dabble in [blacksmithing]({% link 40-blacksmithing.md %}) with a historical focus. I also regularly play Dungeons and Dragons.

My preferred method of contact is through [email](mailto:{{ site.email }}). I also have a [LinkedIn]({{ site.data.links.main.linkedin }}) page detailing my professional career.
