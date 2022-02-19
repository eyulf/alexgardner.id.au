---
layout: post
title: "AWS Certified Security - Specialty"
date: 2022-02-16 12:00 +1100
permalink: /blog/:title/
comments: true
categories: [AWS Cloud Certification]
titleimage: aws-scs
---

{% include blog_image.html image="aws-scs" format="png" alt="AWS Certified Security - Specialty" %}

On {{ page.date | date_to_long_string }}, I passed the [AWS Certified Security - Specialty][aws-scs-exam] exam, and am now an [AWS Certified Security - Specialty][aws-scs-cert].

Unlike my previous exams, I did not have one specific primary study material. Instead my study resources included formal classroom training, a non-specific training course by [Adrian Cantrill][cantrill], and labs from [Tutorials Dojo][tutorialsdojo]. The specific study resources used were:

* Practical experience through working professionally with AWS
* Adrian Cantrill's [Solutions Architect - Professional training course][cantrill-sap-course]
* [Practise Exams][tutorialsdojo-scs] by Tutorials Dojo
* [Study Guide eBook][tutorialsdojo-scs-guide] by Tutorials Dojo
* [Security Engineering on AWS][classroom-training] delivered by [Bespoke Training Services][bespoke]

The exam experience itself is pretty typical for AWS, consisting of 65 multiple choice questions with 180 minutes allowed to answer them. Some of the questions were quite easy, with a short sentence in the question itself and 2-3 word answers. However, some were much harder either due to lengthy questions and answers or very subtle differences in the answers.

There were a few questions that I was not confident in answering. One such question mentioned an AWS service, [AWS Signer][aws-signer], which I had not previously encountered, obviously this is never a good thing in an exam. Overall I found the exam to be reasonably difficult, but did end up finishing with about 50 minutes left on the clock. In terms of difficulty, I would place it between the Associate and Professional exams that I have completed previously.

[aws-scs-exam]:            https://aws.amazon.com/certification/certified-security-specialty/
[aws-scs-cert]:            {{ site.data.links.certs.aws-scs }}
[cantrill]:                https://learn.cantrill.io/
[cantrill-sap-course]:     https://learn.cantrill.io/p/aws-certified-solutions-architect-professional
[tutorialsdojo]:           https://tutorialsdojo.com/
[tutorialsdojo-scs]:       https://portal.tutorialsdojo.com/courses/aws-certified-security-specialty-practice-exams/
[tutorialsdojo-scs-guide]: https://portal.tutorialsdojo.com/product/tutorials-dojo-study-guide-ebook-aws-certified-security-specialty/
[classroom-training]:      https://aws.amazon.com/training/classroom/security-engineering-on-aws/
[bespoke]:                 https://www.bespoketraining.com/
[aws-signer]:              https://docs.aws.amazon.com/signer/latest/developerguide/Welcome.html
