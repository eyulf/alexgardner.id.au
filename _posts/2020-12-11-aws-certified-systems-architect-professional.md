---
layout: post
title: "AWS Certified Systems Architect - Professional"
date: 2020-12-11 21:13 +1100
permalink: /blog/:title/
comments: true
categories: [AWS Cloud Certification]
titleimage: aws-sap
---

{% include blog_image.html image="aws-sap" format="png" alt="AWS Certified Solutions Architect – Professional" %}

On {{ page.date | date_to_long_string }} I passed the [AWS Certified Solutions Architect – Professional][aws-sap-exam] exam, and am now an [AWS Certified Systems Architect - Professional][aws-sap-cert]. This follows me obtaining the [associate certification][aws-saa] in June.

I found this exam was difficult and gruelling! I started studying in earnest for this as soon as I had passed the [Terraform Associate][hc-ta] certification and was studying at every chance I got, in addition to working with AWS almost full time in a new role at work that I had started in August. My primary study material of choice for the exam was an excellent training course by [Adrian Cantrill][cantrill].

Some of the resources I used to help provide the knowledge and skills I needed to pass this exam were:

* Practical experience through working professionally with AWS
* Adrian Cantrill's exam-specific [AWS training course][cantrill-sap-course]
* [Practise Exams][tutorialsdojo-sap] by Tutorials Dojo

I paced myself well through the 3-hour exam, ended up with about 50 minutes of time for reviewing questions, and finished the exam with just under 20 minutes left on the clock. This was actually well ahead of my planned exam schedule to take 50 minutes per 25 questions with 30 minutes of review time.

The exam covered many different topics, and near the end I found myself over thinking questions, generally doubting myself, and thought it very likely that I would fail to pass. It was a huge relief to learn that I passed, and I even got to celebrate it on the day at work's Christmas party.

[aws-sap-exam]:        https://aws.amazon.com/certification/certified-solutions-architect-professional/
[aws-sap-cert]:        {{ site.data.links.certs.aws-sap }}
[cantrill]:            https://learn.cantrill.io/
[cantrill-sap-course]: https://learn.cantrill.io/p/aws-certified-solutions-architect-professional
[tutorialsdojo-sap]:   https://portal.tutorialsdojo.com/courses/aws-certified-solutions-architect-professional-practice-exams/
[hc-ta]:               {% link _posts/2020-10-19-hashicorp-certified-terraform-associate.md %}
[aws-saa]:             {% link _posts/2020-06-19-aws-certified-systems-architect-associate.md %}
