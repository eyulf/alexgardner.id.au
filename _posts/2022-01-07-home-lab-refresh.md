---
layout: post
title: "Home-Lab Refresh"
date: 2022-01-07 19:24 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh
pageimages:
  - name: lab-refresh-1
    desc: Single M900
  - name: lab-refresh-2
    desc: Single M900 (Case Removed)
  - name: lab-refresh-3
    desc: Three M900s
  - name: lab-refresh-4
    desc: Overall Homelab
---

In the last year and a half I've replaced my homelab's compute and overhauled the VMs, which is a fair divergence from the [last version][homelab-part3] of my homelab. The main reason for this was to have multiple physical hypervisors, instead of having all my VMs on one bit of hardware. This enables me to setup some proper clustering style setups and allows me to upgrade/replace/fix a single node without downtime.

When selecting the hardware to use, I still wanted to maintain the small physical foot print, low power usage and low noise that the single NUC provided. This naturally led to small form factor hardware, in particular I was inspired by the [TinyMiniMicro project][sth-project-tmm] introduced by [ServeTheHome][sth].

After reading through reviews, specs and costs I ended up settling on the Lenovo ThinkCentre M900 Tiny (USFF). This was the best fit for the number of nodes I wanted and the budget I was willing to spend. I am using 3 nodes due to a consideration of the number of network and power outlets I have available without needing further monetary outlay.

I sourced the servers from eBay, and beefed up the specs of each node from what I received, replacing the local storage with a 1 TB SSD and increasing the total RAM to 32GB. All up, this came within the rough budget that I'd set, I was also considering replacing the router with an RB4011 but will save that for a future upgrade.

{% include blog_images.html %}

These new hypervisors will serve as the basis for a future Kubernetes cluster, partially for learning and partially to be able to easily run useful things on my network, such as Pi-hole. Running Pi-hole via Kubernetes in particular is the immediate goal, which sets up a number of requirements that I'll cover in future blog posts.

This sort of sets up a mini series for the journey of this homelab refresh. I'll update this page with links to future posts so that this can serve as an index for these with the context above.

1. [Home-Lab Refresh: Hypervisors][homelab-refresh-hypervisor]

[homelab-part3]:  {% link _posts/2017-05-21-home-lab-part-3.md %}
[sth-project-tmm]: https://www.servethehome.com/introducing-project-tinyminimicro-home-lab-revolution/
[sth]: https://www.servethehome.com/
[homelab-refresh-hypervisor]:  {% link _posts/2022-01-09-home-lab-refresh-hypervisor.md %}
