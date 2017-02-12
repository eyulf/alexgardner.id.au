---
layout: post
title: "A Basic Overview of Encryption"
date: 2010-12-15 17:12
categories: [Basics, Security]
permalink: /blog/:title/
published: true
---

Encryption is used to keep confidential  or privileged data confidential and privileged, in order to provide an understanding of  encryption we first need to know what it is.

Encryption is part of the  discipline of Cryptology which is the practice and study of hiding information. Encryption is the process of altering or transforming information/data to make it unreadable to people who do not possess specific knowledge (this usually comes in the form of a key). This is achieved by using a mathematical algorithm (also called a cipher) and applying it to un-encrypted (or plain-text)information, the result is encrypted information (cipher-text) which contains nothing of value unless you are able to decrypt it by reversing the process of encryption. This usually requires the person decrypting to know the key, but if the cipher used is insecure, or if the key is weak then that is not always the case.

Now that we know what it is, we need to know how it is used.

Historically encryption has been used for thousands of years to enable secret communication, it is now commonly used in computer systems and networks to protect information. Encryption can be used in two ways, protecting data in transit and protecting data at rest (in various forms of storage). Data in transit is vulnerable to being intercepted by third parties, for example packet sniffing and capture. It is for these reasons that it is important for the data to be protected by encryption, however encryption is only useful in this context if the encryption happens from the point of origin to the end point. This makes sure that there is no possibility for it to be intercepted and potentially tampered with. Data kept in storage is only as secure as the computer it is kept on. If a laptop get stolen, or if a server is broken into, then any plain-text information stored on there is likely to be stolen, and should be considered compromised. Encryption protects against this by making the files unreadable.

One problem presented with encryption is that despite knowing that the information that is encrypted is confidential, there is no guarantee that the encrypted data came from a specific person. This can be addressed by the usage of data integrity and  authenticity techniques, such as digital signatures.

Encryption is achieved by using cryptographic software and/or hardware and applicable standards, some of which are widely available. The main challenge with encryption is "doing it right", any flaws in planning or execution can undo the protection, and allow adversaries to obtain the information being protected. One example of "doing it right" as far as encryption goes is the <a href="http://news.techworld.com/security/3228701/fbi-hackers-fail-to-crack-truecrypt/">Brazillian Banker</a> who used the open-source <a href="www.truecrypt.org/">truecrypt</a> program to secure hard-drives which were seized in police raids. Local authorities, and even the FBI, failed to crack the passphrase that was used.
