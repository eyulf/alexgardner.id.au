---
layout: post
title: "HashiCorp Certified: Terraform Associate"
date: 2020-10-19 21:53 +1100
permalink: /blog/:title/
comments: true
categories: [HashiCorp Terraform Cloud Certification]
titleimage: hc-ta
---

{% include blog_image.html image="hc-ta" format="png" alt="HashiCorp Certified: Terraform Associate" %}

On {{ page.date | date_to_long_string }}, I passed the [HashiCorp Certified: Terraform Associate][hc-ta-exam] exam, and am now a [HashiCorp Certified: Terraform Associate][hc-ta-cert].

I did not find this exam too difficult as I had been using Terraform quite a bit at this point, both at work and outside of work (The infrastructure for this website was deployed using Terraform). I did however complete a [training course by Zeal Vora][udemy-ta-course] on Udemy to ensure any gaps were covered. I ended up not needing much of the content of the course, but it was good to cover everything that the exam is looking for. The major gap I had was specifically relating to Terraform Cloud, as we do not use this at work.

The main issues I had with the exam was related to PSI being the only exam vendor, and not having the option to do the exam in person. Throughout the exam, I was disconnected twice due to 'network issues' and given that I was able to immediately reconnect I am sceptical that this was caused by my internet connection. This was very disruptive to the exam as each time it dropped I had to wait for a proctor to go through the verification process with PSI again.

Overall this was an extremely bad experience, I think I passed the exam within 20-30 minutes of actual exam time, but the exam overall took over 60-90 minutes due to the disruptions. If I had the option I would have done this in person to ensure that the issues I faced were not a factor. Had I been less confident in the material this could have easily thrown me off the mental exam preparation.

During my study/research I found an article on [Medium.com by 'ravadonis'][medium-ta] that covers many of the available resources to learn Terraform and study for this exam, I would recommend anyone looking to do this with no prior experience to start by reading [the article][medium-ta].

[hc-ta-exam]:      https://www.hashicorp.com/certification/terraform-associate
[hc-ta-cert]:      {{ site.data.links.certs.tf-associate }}
[udemy-ta-course]: https://www.udemy.com/course/terraform-beginner-to-advanced/
[medium-ta]:       https://medium.com/@ravadonis/guidance-on-hashicorp-certified-terraform-associate-1fa6f04af1d2
