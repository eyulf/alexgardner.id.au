---
layout: post
title: "AWS Certified SysOps Administrator - Associate"
date: 2022-11-06 19:30 +1100
permalink: /blog/:title/
comments: true
categories: [AWS Cloud Certification]
titleimage: aws-soa
---

{% include blog_image.html image="aws-soa" format="png" alt="AWS Certified SysOps Administrator - Associate" %}

On {{ page.date | date_to_long_string }}, I passed the [AWS Certified SysOps Administrator - Associate][aws-soa-exam] exam, and am now an [AWS Certified SysOps Administrator - Associate][aws-soa-cert]. I have been working towards the DevOps Professional Certification and this is the first concrete step in this process.

As with my [last exam][aws-sap], in terms of formal study, my primary material of choice for the exam was the training course by [Adrian Cantrill][cantrill], supplemented with labs from [Tutorials Dojo][tutorialsdojo]. The specific study resources used were:

* Practical experience through working professionally with AWS
* Adrian Cantrill's exam-specific [AWS training course][cantrill-soa-course]
* [Practise Exams][tutorialsdojo-soa] by Tutorials Dojo

I took the new exam format, which is a first for AWS exams included labs. My study and learning for this have been very sporadic over the last few months. In hindsight, I probably could have passed this exam several months ago and felt that I ended up over preparing for this.

The first major difference with the new exam format itself, due to the inclusion of the labs, is that you do not immediately get to see if you've passed or failed. Instead, you get notified within 5 business days; I got my results approximately 24 hours after completing the exam.

The exam itself is 190 minutes, of which I had 50 questions and 3 labs to complete within this time. The exam interface advised allowing 20 minutes per lab, which were delivered by being logged into a pre-configured VM and AWS account, with the lab requirements/instructions on a sidebar. I did not get any questions that were not covered by the study material and, with the exception of a small handful, did not find them too difficult.

[aws-soa-exam]:        https://aws.amazon.com/certification/certified-sysops-admin-associate/
[aws-soa-cert]:        {{ site.data.links.certs.aws-soa }}
[cantrill]:            https://learn.cantrill.io/
[cantrill-soa-course]: https://learn.cantrill.io/p/aws-certified-sysops-administrator-associate
[tutorialsdojo]:       https://tutorialsdojo.com/
[tutorialsdojo-soa]:   https://portal.tutorialsdojo.com/courses/aws-certified-sysops-administrator-associate-practice-exams/
[hc-ta]:               {% link _posts/2020-10-19-hashicorp-certified-terraform-associate.md %}
[aws-sap]:             {% link _posts/2020-12-11-aws-certified-systems-architect-professional.md %}
