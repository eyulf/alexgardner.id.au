---
layout: post
title: "What is a DDOS?"
date: 2011-04-16 19:41 +1100
categories: [Basics, Security]
permalink: /blog/:title/
published: true
titleimage: loic
---

A *distributed denial of service* (DDoS) is a method of attacking a website or service by preventing legitimate usage from using up the resources it has available. A DDoS is a denial of service (DoS) attack, but on a much larger scale, most commonly used to attack targets on the Internet.

These attacks are mostly performed by a group of malware infected computers which are controlled by a single entity using a series of command and control servers, these are known as botnets. Although there are tools such as the Low-orbit Ion Cannon (LOIC) that can be used to co-ordinate voluntary participation in DDoS attacks or botnets performing them. They can also happen inadvertently, for example when a highly popular link sharing website posts a link to a website, and it's users overload the servers of the linked website.

Computers are not the only target though and there have been instances when phones have been [targeted as well][phone-attacks].

DDoS attacks can be performed using several different methods, the most common are listed below.

**SYN Flood**

This vector works by sending multiple SYN requests to the target all at once, attempting to use as much resources on the target system as possible. Normally when a TCP connection is requested it goes through what is know as the three-way handshake. This works as such;

* The client sends a SYN (synchronise) request to the server
* The server then acknowledges this by sending a SYN-ACK back to the client
* The client responds with an ACK and the connection is started.

The SYN flood works by not responding with the ACK expected by the server, the server will wait for the ACK leaving the connection half open. As the attacker is sending a flood of SYN requests the server will quickly accumulate half open connections until it runs out of resources to make new connections.

**TCP/UDP Flood**

This vector is quite simple, the attacker literately floods the target with TCP or UDP packets which disrupt the service of the victim. The LOIC tool uses this method, and a DDoS is performed when multiple LOIC users target the same server.

**ICMP Flood** (ping of death)

This vector can be used in a few different ways, one is sending a continuous stream of ping packets. if the target has less bandwidth then the attacker they are overwhelmed by the requests and will have great difficulty responding to legitimate traffic. This method can also be used with a spoofed source IP address as the target and the attacker sending ping requests to everyone on the network, which in turn reply to the target IP address. These are not very useful now as ICMP traffic is mostly either blocked or given low priority.

*It is important to remember that no matter the reasons for a DDoS attack, it is still viewed by law enforcement all around the globe as an illegal act. A sloppy DDoS attack can be traced quite easily.*

[phone-attacks]: http://gawker.com/5615031/justin-biebers-twitter-victim-demands-apology
