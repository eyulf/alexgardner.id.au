---
layout: post
title: "Home-Lab DNS"
date: 2022-04-17 13:13 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-dns
---

Since setting up [PowerDNS][homelab-refresh-dns] and [Pi-Hole][homelab-refresh-k8s-pihole] as part of my [Homelab Refresh][homelab-refresh], DNS has become a little bit complicated in my home network. This post will explain how it all fits together.

1. [Overview](#overview)
1. [Router](#router)
1. [PowerDNS](#powerdns)
1. [Pi-Hole](#pi-hole)
1. [Results](#results)

## Overview

Broadly, DNS traffic from clients (from both the wireless and client networks) is forced to go through my router. From there DNS is forwarded to PowerDNS, for any non local requests it is then forwarded to Pi-Hole, which then forwards it to CloudFlare. The following Diagram visually shows what is going on.

{% include blog_image.html image="homelab-dns" format="png" alt="Homelab DNS diagram" %}

## Router

The configuration of the router is primarily what drives the effectiveness of this setup. Taking inspiration from a [blog post by Labzilla][labzilla-blog-force-dns] that raises the issue of devices ignoring DHCP provided DNS, I've used the router to force clients to use my configuration. Since this is a Mikrotik device, I can use the CLI to configure it. Firstly I have the router configured to use the PowerDNS servers as its upstream DNS. 

```
[adminuser@router.example.domain.local] > /ip dns print
                      servers: 10.1.1.31,10.1.1.32,10.1.1.33
              dynamic-servers: 
               use-doh-server: 
              verify-doh-cert: no
        allow-remote-requests: yes
          max-udp-packet-size: 4096
         query-server-timeout: 2s
          query-total-timeout: 10s
       max-concurrent-queries: 100
  max-concurrent-tcp-sessions: 20
                   cache-size: 2048KiB
                cache-max-ttl: 1w
                   cache-used: 47KiB
```

### Destination NAT

I'm using Destination NAT (dst-nat) rules to redirect all DNS traffic from clients to the router. The `Clients` interface list contains both the wireless interface as well as the interfaces used exclusively by clients. To prevent any redirection issues from occurring, there is an address-list of approved IPs that can ignore these rules.

```
[adminuser@router.example.domain.local] > /ip firewall address-list print where list="PrivateDNS"
Flags: X - disabled, D - dynamic 
 #   LIST                      ADDRESS                                       CREATION-TIME        TIMEOUT             
 0   PrivateDNS                10.1.1.70                                     dec/28/2020 15:55:25
 1   PrivateDNS                10.1.1.33                                     aug/09/2021 18:00:56
 2   PrivateDNS                10.1.1.31                                     aug/09/2021 18:01:55
 3   PrivateDNS                10.1.1.32                                     aug/09/2021 18:01:57
```

```
[adminuser@router.example.domain.local] > /ip firewall nat print where chain=dstnat 
Flags: X - disabled, I - invalid, D - dynamic 
 0    ;;; Allow Pihole DNS
      chain=dstnat action=accept src-address-list=PrivateDNS log=no log-prefix="" 

 1    ;;; Force DNS to Pihole
      chain=dstnat action=dst-nat to-addresses=10.1.1.1 protocol=tcp in-interface-list=Clients dst-port=53 log=no 
      log-prefix="" 

 2    chain=dstnat action=dst-nat to-addresses=10.1.1.1 protocol=udp in-interface-list=Clients dst-port=53 log=no 
      log-prefix="" 
```

### Firewall

Additionally, I'm using firewall rules to block DNS traffic that is using DNS over TLS/HTTPS. This is done with another address-list using IPs sourced from [public-dns.info][public-dns-info] and a corresponding set of firewall rules.

```
[adminuser@router.example.domain.local] > /ip firewall address-list print count-only where list="PublicDNS"
5953
[adminuser@router.example.domain.local] > /ip firewall address-list print where list="PublicDNS"
Flags: X - disabled, D - dynamic 
 #   LIST                      ADDRESS                                       CREATION-TIME        TIMEOUT             
 0   PublicDNS                 1.1.1.1                                       aug/09/2021 17:47:02
 1   PublicDNS                 8.8.8.8                                       aug/09/2021 17:51:13
 2   PublicDNS                 8.8.4.4                                       aug/09/2021 17:51:14
 3   PublicDNS                 199.255.137.34                                aug/09/2021 17:51:53
 4   PublicDNS                 103.112.162.165                               aug/09/2021 17:51:53
 5   PublicDNS                 103.133.222.202                               aug/09/2021 17:51:53
 6   PublicDNS                 82.146.26.2                                   aug/09/2021 17:51:53
 7   PublicDNS                 94.236.218.254                                aug/09/2021 17:51:53
 8   PublicDNS                 185.81.41.81                                  aug/09/2021 17:51:53
 9   PublicDNS                 103.209.52.250                                aug/09/2021 17:51:53
10   PublicDNS                 119.160.80.164                                aug/09/2021 17:51:53
11   PublicDNS                 151.80.222.79                                 aug/09/2021 17:51:53
12   PublicDNS                 194.27.192.6                                  aug/09/2021 17:51:53
13   PublicDNS                 109.205.112.9                                 aug/09/2021 17:51:53
-- [Q quit|D dump|down]
```

```
[adminuser@router.example.domain.local] > /ip firewall filter print where dst-address-list="PublicDNS"
Flags: X - disabled, I - invalid, D - dynamic 
 0    ;;; Block HTTPS - PublicDNS list
      chain=forward action=reject reject-with=icmp-network-unreachable protocol=tcp src-address-list=!PrivateDNS dst-address-list=PublicDNS 
      in-interface-list=Clients dst-port=443 log=no log-prefix="" 

 1    chain=forward action=reject reject-with=icmp-network-unreachable protocol=udp src-address-list=!PrivateDNS dst-address-list=PublicDNS 
      in-interface-list=Clients dst-port=443 log=no log-prefix="" 

 2    chain=forward action=reject reject-with=icmp-network-unreachable protocol=tcp src-address-list=!PrivateDNS dst-address-list=PublicDNS 
      in-interface-list=Clients dst-port=853 log=no log-prefix="" 

 3    chain=forward action=reject reject-with=icmp-network-unreachable protocol=udp src-address-list=!PrivateDNS dst-address-list=PublicDNS 
      in-interface-list=Clients dst-port=853 log=no log-prefix="" 
```

This results in clients not being able to connect to public DNS servers on either port 443 (DNS over HTTPS) or 853 (DNS over TLS). Setting this up was extremely painful because Mikrotik do not currently have address-lists that can be sourced from URLs, instead each IP needed to be manually added.

I ended up grabbing the [plaintext list][public-dns-info-plaintext-list] of public DNS servers, manually removing the IPV6 servers, and then using `sed` to build out a list of Mikrotik CLI commands (example below) to add each IP address individually to the address list.

```
[adminuser@router.example.domain.local] > /ip firewall address-list add address=12.90.208.78 list=PublicDNS
[adminuser@router.example.domain.local] >
```

Yes, I did copy almost 6000 commands into my Mikrotik CLI! I obviously was not able to do this all at once and had to chunk it over a period of time. I'll likely automate this process when I get around to updating the list.

## PowerDNS

PowerDNS is configured as both an Authoritative server for local zones, as well as a Recursor for everything else. The Recursor service is what listens on port 53 and it forwards anything that is not a local zone to Pi-Hole.

[etc/powerdns/recursor.d/recursor.conf][ansible-roles-dns-server-templates-etc-powerdns-recursor-d-recursor-conf-j2]
```
# allow-from=127.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 169.254.0.0/16, 192.168.0.0/16, 172.16.0.0/12, ::1/128, fc00::/7, fe80::/10
allow-from=127.0.0.0/8,10.1.1.0/24,10.1.2.0/24,10.1.3.0/24

# forward-zones=
forward-zones=example.domain.local=127.0.0.1:5300
forward-zones+=1.1.10.in-addr.arpa=127.0.0.1:5300

# forward-zones-recurse=
forward-zones-recurse=.=10.1.1.70;1.0.0.1;1.1.1.1

# local-address=127.0.0.1
local-address=0.0.0.0, ::

# max-cache-ttl=86400
max-cache-ttl=3600

# max-negative-ttl=3600
max-negative-ttl=300

# version-string=PowerDNS Recursor 4.1.11
version-string=PowerDNS Recursor
```

## Pi-Hole

Since Pi-Hole is [deployed into my Kubernetes Cluster][homelab-refresh-k8s-pihole], the configuration of this is set using Helm values. At the end of the day Pi-Hole is running from a docker container, so I only need to expose that container to my network. This is done using MetalLB, which provides an IP address for the Pi-Hole Kubernetes pod using the LoadBalancer resource.

[kubernetes/apps/pihole/values.yaml][kubernetes-apps-pihole-values-yaml]
```
---
pihole:
  image:
    tag: '2022.02.1'
  serviceWeb:
    loadBalancerIP: 10.1.1.70
    annotations:
      metallb.universe.tf/allow-shared-ip: pihole-svc
    type: LoadBalancer
  serviceDns:
    loadBalancerIP: 10.1.1.70
    annotations:
      metallb.universe.tf/allow-shared-ip: pihole-svc
    type: LoadBalancer
  serviceDhcp:
    enabled: false
  podDnsConfig:
    enabled: true
    policy: "None"
    nameservers:
    - 127.0.0.1
    - 1.1.1.1
  admin:
    existingSecret: "admin-password"
    #checkov:skip=CKV_SECRET_6:Checkov thinks this is actually a password
    passwordKey: "password"
  DNS1: 1.1.1.1
  DNS2: 1.0.0.1
```

This configuration translates to the following in the Pi-Hole GUI.

{% include blog_image.html image="homelab-dns-pihole" format="png" alt="Pi-Hole settings GUI" %}

As indicated, DNS requests that are not blocked by Pi-Hole are forwarded to Cloudflare's public DNS resolvers.


## Results

The outcome of all of this is that any DNS requests on port 53 from clients are transparently run through both PowerDNS and Pi-Hole before being forwarded to Cloudflare's public DNS resolvers if required, regardless of the DNS server specified.

```
[user@workstation homelab]$ nslookup router.example.domain.local 1.1.1.1
Server:   1.1.1.1
Address:  1.1.1.1#53

Non-authoritative answer:
Name: router.example.domain.local
Address: 10.1.1.1

[user@workstation homelab]$ nslookup router.example.domain.local 8.8.8.8
Server:   8.8.8.8
Address:  8.8.8.8#53

Non-authoritative answer:
Name: router.lab.example.domain.local
Address: 10.1.1.1
```

Additionally, any DNS requests that attempt to bypass this by using DNS over HTTPS or TLS are blocked.

```
[user@workstation homelab]$ telnet 1.1.1.1 443
Trying 1.1.1.1...
telnet: connect to address 1.1.1.1: Network is unreachable
[user@workstation homelab]$ telnet 1.1.1.1 853
Trying 1.1.1.1...
telnet: connect to address 1.1.1.1: Network is unreachable
```

[homelab-refresh]:             {% link _posts/2022-01-07-home-lab-refresh.md %}
[homelab-refresh-dns]:         {% link _posts/2022-01-13-home-lab-refresh-dns.md %}
[homelab-refresh-k8s-pihole]:  {% link _posts/2022-04-16-home-lab-refresh-kubernetes-pihole.md %}

[labzilla-blog-force-dns]:        https://labzilla.io/blog/force-dns-pihole
[public-dns-info]:                https://public-dns.info/
[public-dns-info-plaintext-list]: https://public-dns.info/nameservers-all.txt

[ansible-roles-dns-server-templates-etc-powerdns-recursor-d-recursor-conf-j2]: https://github.com/eyulf/homelab/blob/d1958720a8ea67a9389bd1c83a5b6a76dd0aab29/ansible/roles/dns_server/templates/etc/powerdns/recursor.d/recursor.conf.j2
[kubernetes-apps-pihole-values-yaml]:                                          https://github.com/eyulf/homelab/blob/d1958720a8ea67a9389bd1c83a5b6a76dd0aab29/kubernetes/apps/pihole/values.yaml
