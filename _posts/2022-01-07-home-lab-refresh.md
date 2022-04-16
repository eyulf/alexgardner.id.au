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

This sort of sets up a mini series for the journey of this homelab refresh. I'll update this page with links to future posts so that this can serve as an index for these with the context above. For the purposes of configuration examples throughout this, we will assume the following:

```
Domain:           example.domain.local
Server Network:   10.1.1.0/24
Wireless Network: 10.1.2.0/24
Client Network:   10.1.3.0/24
Server Gateway:   10.1.1.1
Admin User:       adminuser
```

The above values are just examples and are not actually used by my homelab.

Further posts in this 'mini series' are:

1. [Home-Lab Refresh: Hypervisors][homelab-refresh-hypervisor]
1. [Home-Lab Refresh: DNS][homelab-refresh-dns]
1. [Home-Lab Refresh: Kubernetes Cluster Installation][homelab-refresh-k8s-install]
1. [Home-Lab Refresh: Kubernetes Cluster Gitops][homelab-refresh-k8s-gitops]
1. [Home-Lab Refresh: Kubernetes Cluster Secrets][homelab-refresh-k8s-secrets]
1. [Home-Lab Refresh: Kubernetes Cluster Secrets][homelab-refresh-k8s-argocd]
1. [Home-Lab Refresh: Kubernetes Cluster Secrets][homelab-refresh-k8s-pihole]

[homelab-part3]:   {% link _posts/2017-05-21-home-lab-part-3.md %}
[sth-project-tmm]: https://www.servethehome.com/introducing-project-tinyminimicro-home-lab-revolution/
[sth]:             https://www.servethehome.com/

[homelab-refresh-hypervisor]:  {% link _posts/2022-01-09-home-lab-refresh-hypervisor.md %}
[homelab-refresh-dns]:         {% link _posts/2022-01-13-home-lab-refresh-dns.md %}
[homelab-refresh-k8s-install]: {% link _posts/2022-01-22-home-lab-refresh-kubernetes-install.md %}
[homelab-refresh-k8s-gitops]:  {% link _posts/2022-01-25-home-lab-refresh-kubernetes-gitops.md %}
[homelab-refresh-k8s-secrets]: {% link _posts/2022-01-29-home-lab-refresh-kubernetes-secrets.md %}
[homelab-refresh-k8s-argocd]:  {% link _posts/2022-02-26-home-lab-refresh-kubernetes-argocd.md %}
[homelab-refresh-k8s-pihole]:  {% link _posts/2022-04-16-home-lab-refresh-kubernetes-pihole.md %}
