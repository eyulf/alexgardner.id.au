---
layout: post
title: "Home-Lab Refresh: Kubernetes Cluster Traefik"
date: 2022-04-24 16:56 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab-refresh-kubernetes-traefik
---

After [installing Pi-Hole][homelab-refresh-k8s-pihole], we now have an app with a web interface. When it was installed, it was only accessible on plain HTTP using an IP address. While it allows access short-term, this goes against best practice and needs to be rectified in the long term. This means we now need a Kubernetes [Ingress Controller][k8s-ingress-controller].

There are many options for Ingress Controllers, the [Kubernetes documentation][k8s-ingress-controller] listed over 20 options when this was written. This does make picking one more difficult simply because of the number of options. However, we do not necessarily need something with all the bells and whistles as we only need a reverse proxy that supports HTTPS. With that said, something with [service mesh][wiki-service-mesh] and [single sign-on][wiki-sso] support would be nice to have, but these are not needed right at this moment.

After researching the available options, I opted going for [traefik][traefik] for the following reasons, among others.

1. Well documented, both officially and with external guides.
1. [Let’s Encrypt][lets-encrypt] certificate encryption out of the box.
1. Support for extending additional features using middleware.

I was very close to choosing [Istio][istio], however, due to its [resource usage][istio-performance] and the fact that I do not need a service mesh as yet I ended up using traefik instead.

The steps for deploying Traefik are fairly simple, but I did encounter some gotchas.

1. [Installation](#installation)
1. [Configuration](#configuration)
1. [Usage](#usage)
1. [Next Steps](#next-steps)

## Installation

Traefik maintains an official Helm chart, so installing it using ArgoCD is straight forward. The new ArgoCD files we have created are:

1. [kubernetes/infrastructure/apps/templates/traefik.yaml][kubernetes-infrastructure-apps-templates-traefik-yaml]
1. [kubernetes/infrastructure/traefik/Chart.yaml][kubernetes-infrastructure-traefik-chart-yaml]
1. [kubernetes/infrastructure/traefik/values.yaml][kubernetes-infrastructure-traefik-values-yaml]

Once these are committed to git, we can confirm that ArgoCD has deployed the new app.

```
adminuser@k8s-controller-01:~$ sudo argocd app get traefik --core
Name:               traefik
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          traefik-infra
URL:                http://localhost:45393/applications/traefik
Repo:               https://github.com/eyulf/homelab.git
Target:             main
Path:               kubernetes/infrastructure/traefik
SyncWindow:         Sync Allowed
Sync Policy:        Automated
Sync Status:        Synced to main (590f5d0)
Health Status:      Healthy

GROUP                      KIND                      NAMESPACE      NAME                                   STATUS     HEALTH  HOOK  MESSAGE
                           Namespace                                traefik-infra                          Succeeded  Synced        namespace/traefik-infra created
                           ServiceAccount            traefik-infra  traefik                                Synced                   serviceaccount/traefik created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  tlsstores.traefik.containo.us          Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/tlsstores.traefik.containo.us created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  traefikservices.traefik.containo.us    Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/traefikservices.traefik.containo.us created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  middlewaretcps.traefik.containo.us     Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/middlewaretcps.traefik.containo.us created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  ingressrouteudps.traefik.containo.us   Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/ingressrouteudps.traefik.containo.us created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  serverstransports.traefik.containo.us  Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/serverstransports.traefik.containo.us created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  ingressroutes.traefik.containo.us      Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/ingressroutes.traefik.containo.us created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  tlsoptions.traefik.containo.us         Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/tlsoptions.traefik.containo.us created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  ingressroutetcps.traefik.containo.us   Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/ingressroutetcps.traefik.containo.us created
apiextensions.k8s.io       CustomResourceDefinition  traefik-infra  middlewares.traefik.containo.us        Succeeded  Synced        customresourcedefinition.apiextensions.k8s.io/middlewares.traefik.containo.us created
rbac.authorization.k8s.io  ClusterRole               traefik-infra  traefik                                Succeeded  Synced        clusterrole.rbac.authorization.k8s.io/traefik reconciled. reconciliation required create
                           missing rules added:
                                               {Verbs:[get list watch] APIGroups:[] Resources:[services endpoints secrets] ResourceNames:[] NonResourceURLs:[]}
                                               {Verbs:[get list watch] APIGroups:[extensions networking.k8s.io] Resources:[ingresses ingressclasses] ResourceNames:[] NonResourceURLs:[]}
                                               {Verbs:[update] APIGroups:[extensions networking.k8s.io] Resources:[ingresses/status] ResourceNames:[] NonResourceURLs:[]}
                                               {Verbs:[get list watch] APIGroups:[traefik.containo.us] Resources:[ingressroutes ingressroutetcps ingressrouteudps middlewares middlewaretcps tlsoptions tlsstores traefikservices serverstransports] ResourceNames:[] NonResourceURLs:[]}. clusterrole.rbac.authorization.k8s.io/traefik configured. Warning: resource clusterroles/traefik is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by  apply.  apply should only be used on resources created declaratively by either  create --save-config or  apply. The missing annotation will be patched automatically.
rbac.authorization.k8s.io  ClusterRoleBinding  traefik-infra  traefik  Succeeded  Synced    clusterrolebinding.rbac.authorization.k8s.io/traefik reconciled. reconciliation required create
                           missing subjects added:
                                                     {Kind:ServiceAccount APIGroup: Name:traefik Namespace:traefik-infra}. clusterrolebinding.rbac.authorization.k8s.io/traefik configured. Warning: resource clusterrolebindings/traefik is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by  apply.  apply should only be used on resources created declaratively by either  create --save-config or  apply. The missing annotation will be patched automatically.
                           Service                   traefik-infra  traefik                                Synced     Healthy            service/traefik created
apps                       Deployment                traefik-infra  traefik                                Synced     Healthy            deployment.apps/traefik created
traefik.containo.us        IngressRoute              traefik-infra  traefik-dashboard                      Succeeded           PostSync  traefik-dashboard created
apiextensions.k8s.io       CustomResourceDefinition                 ingressroutes.traefik.containo.us      Synced                        
apiextensions.k8s.io       CustomResourceDefinition                 ingressroutetcps.traefik.containo.us   Synced                        
apiextensions.k8s.io       CustomResourceDefinition                 ingressrouteudps.traefik.containo.us   Synced                        
apiextensions.k8s.io       CustomResourceDefinition                 middlewares.traefik.containo.us        Synced                        
apiextensions.k8s.io       CustomResourceDefinition                 middlewaretcps.traefik.containo.us     Synced                        
apiextensions.k8s.io       CustomResourceDefinition                 serverstransports.traefik.containo.us  Synced                        
apiextensions.k8s.io       CustomResourceDefinition                 tlsoptions.traefik.containo.us         Synced                        
apiextensions.k8s.io       CustomResourceDefinition                 tlsstores.traefik.containo.us          Synced                        
apiextensions.k8s.io       CustomResourceDefinition                 traefikservices.traefik.containo.us    Synced                        
rbac.authorization.k8s.io  ClusterRole                              traefik                                Synced                        
rbac.authorization.k8s.io  ClusterRoleBinding                       traefik                                Synced                        
```

We can also confirm that the new namespace exists in Kubernetes.

```
adminuser@k8s-controller-01:~$ sudo kubectl get all -n traefik-infra
NAME                           READY   STATUS    RESTARTS   AGE
pod/traefik-667b854789-twhr5   1/1     Running   0          4m43s

NAME              TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE
service/traefik   LoadBalancer   10.100.101.214   10.1.1.71     80:32641/TCP,443:32627/TCP   4m43s

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/traefik   1/1     1            1           4m43s

NAME                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/traefik-667b854789   1         1         1       4m44s
```

## Configuration

Configuring Traefik is straight forward, however, picking the right configuration is not. Luckily the [Traefik documentation][traefik-docs] is quite useful, as is the [Artifact Hub page][artifacthub] for the Helm chart.

First, we need to create a secret that will be used later. We are using [CloudFlare][cloudflare] to provide a DNS challenge for Let's Encrypt, so we need a [valid API key][cloudflare-api-key].

```
[user@workstation homelab]$ kubectl create secret generic cloudflare \
--from-literal=dns-token=mysupersecretpasword \
--dry-run=client -o yaml | kubeseal \
--cert "ansible/roles/kubernetes_controller/files/etc/kubernetes/secrets/sealed-secrets.pem" -n traefik-infra -o yaml \
> kubernetes/infrastructure/traefik/objects/secret-cloudflare.yaml
```

This creates the file [`kubernetes/infrastructure/traefik/objects/secret-cloudflare.yaml`][kubernetes-infrastructure-traefik-objects-secret-cloudflare-yaml].
```
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  creationTimestamp: null
  name: cloudflare
  namespace: traefik-infra
spec:
  encryptedData:
    dns-token: AgCKjGCmiOfs1PuPc0AjhdmkRrFDoa7wGlcH0MZ0KCpejPd6b3iBye+3Eeu6Sx5wZnHtbFf+oKtc+G/WLhk98X2KVw9NWKW062N+uHyrIszQa6dKZ8YLByaHEiqUTw/3MntL98ZWQtdImGU4SbT8pGzdyNyvWOT4mNIVNziOGWh2V8HuP1IygMc7G37y1mdp6LzCKheRND/pdGn+85m6zIBdX2xSaLzmmmC0NMzPqnT1wCQd7EMda5zQk4DzTtmtF9MQusf5mDlnhWYt7LeA67WY5zmagTg3uogj1QAGqEbcnO36VPLrMH6CIOManfgjIxJD+bCHRiWMgiXlibkNkf3Xgc8kxqkERyHnBzSOwC6l7x5P4CLsbEqiPXigUjpmw9Lp8phRcPeJ06B1hO2jP3FMtNuu1+8D3PbTFxfeQypQGDfCJN5hneikKleQ4egnhxjwkHz4x46pGKbbZa9FK7L22nv0O7saiMvd2susSD3zq1Mx4x+di2mPdn4sxIn0S7AQpMy8JjyUuVYTmjz6lzEVjXUHJJ40owWTBl2H+YiEiMngrFz+1jXcoV2zoHPU/MNukLArQV3CEEK0yspxrnqoDv1k8WZZXsna3QHkOkrIH7YnZUbveHLdKG+4wwSgT1lDwHKDid6vQ/LGN6V/F187PH5WEJJaUy2aj4EdXyYkfPgeiQXY0EJ0pxOP4T9SgUNsABmUbho5ewqXjhgF9VREfVaZ65YtXLQIF7gXZLS17d25oIaxeRid
  template:
    data: null
    metadata:
      creationTimestamp: null
      name: cloudflare
      namespace: traefik-infra
```

Next we need to update Traefik's [`values.yaml`][kubernetes-infrastructure-traefik-values-yaml2] file with our desired configuration. The `ports` config determines how the reverse proxy behaves, while the `certificatesresolvers` config ensures we can use Let's Encrypt with CloudFlare as a DNS challenge.

```
---
traefik:
  logs:
    general:
      level: INFO
    access:
      enabled: false
  ports:
    web:
      redirectTo: websecure
    websecure:
      tls:
        enabled: true
        certResolver: "letsencrypt"
  additionalArguments:
    - "--certificatesresolvers.letsencrypt.acme.email=alex+letsencrypt@alexgardner.id.au"
    - "--certificatesresolvers.letsencrypt.acme.storage=/data/acme.json"
    - "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-v02.api.letsencrypt.org/directory"
    - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
    - "--certificatesresolvers.letsencrypt.acme.dnschallenge.resolvers=1.1.1.1:53,1.0.0.1:53"
    - "--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare"
  env:
    - name: CF_DNS_API_TOKEN
      valueFrom:
        secretKeyRef:
          name: cloudflare
          key: dns-token
    - name: CLOUDFLARE_PROPAGATION_TIMEOUT
      value: "300"
```

We also need to [create an App][kubernetes-infrastructure-apps-templates-traefik-objects-yaml] for ArgoCD to deploy the Traefik objects directory.

```
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: traefik-objects
  namespace: argocd-system
  finalizers:
  - resources-finalizer.argocd.argoproj.io
spec:
  destination:
    namespace: traefik-infra
    server: {{ .Values.spec.destination.server }}
  project: default
  source:
    path: kubernetes/infrastructure/traefik/objects
    repoURL: {{ .Values.spec.source.repoURL }}
    targetRevision: {{ .Values.spec.source.targetRevision }}
  syncPolicy:
    automated: {}
    syncOptions:
      - CreateNamespace=true
```

In summary we have created the following files.

1. [kubernetes/infrastructure/apps/templates/traefik-objects.yaml][kubernetes-infrastructure-apps-templates-traefik-objects-yaml]
1. [kubernetes/infrastructure/traefik/values.yaml][kubernetes-infrastructure-traefik-values-yaml2]
1. [kubernetes/infrastructure/traefik/objects/secret-cloudflare.yaml][kubernetes-infrastructure-traefik-objects-secret-cloudflare-yaml]

Once these are committed to git, we can confirm that ArgoCD has deployed the new app.

```
adminuser@k8s-controller-01:~$ sudo argocd app get traefik-objects --core
Name:               traefik-objects
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          traefik-infra
URL:                http://localhost:38771/applications/traefik-objects
Repo:               https://github.com/eyulf/homelab.git
Target:             main
Path:               kubernetes/infrastructure/traefik/objects
SyncWindow:         Sync Allowed
Sync Policy:        Automated
Sync Status:        Synced to main (e2bb927)
Health Status:      Healthy

GROUP        KIND          NAMESPACE      NAME        STATUS  HEALTH   HOOK  MESSAGE
bitnami.com  SealedSecret  traefik-infra  cloudflare  Synced  Healthy        sealedsecret.bitnami.com/cloudflare configured
```

We can also confirm that the new secret exists in Kubernetes.

```
adminuser@k8s-controller-01:~$ sudo kubectl get secrets -n traefik-infra
NAME                  TYPE                                  DATA   AGE
cloudflare            Opaque                                1      75s
default-token-cnnzs   kubernetes.io/service-account-token   3      45m
traefik-token-c5t9c   kubernetes.io/service-account-token   3      45m
```

### Gotchas

One thing that is not apparent from documentation is that the additional argument `--certificatesresolvers.letsencrypt.acme.dnschallenge.resolvers` _must_ be set with working nameservers. If this is not done, CloudFlare's API will return an error stating the domain cannot be found that looks like the following.

```
time="2022-04-22T11:12:59Z" level=error msg="Unable to obtain ACME certificate for domains \"pihole.lab.alexgardner.id.au\": unable to generate a certificate for the domains [pihole.lab.alexgardner.id.au]: error: one or more domains had a problem:\n[pihole.lab.alexgardner.id.au] [pihole.lab.alexgardner.id.au] acme: error presenting token: cloudflare: failed to find zone lab.alexgardner.id.au.: zone could not be found\n" providerName=letsencrypt.acme ACME CA="https://acme-v02.api.letsencrypt.org/directory" routerName=pihole-admin-ingress-d909fd1e73a3c50983b5@kubernetescrd rule="Host(`pihole.lab.alexgardner.id.au`)"
```

Also note that the configuration examples throughout the [Traefik Documentation][traefik-docs] that reference the following addreses will not work with the Helm chart, instead, you will get `Connection refused` errors when attempting to use `IngressRoutes`.

```
--entrypoints.web.address=:80
--entrypoints.websecure.address=:443
```

This did catch me out, the reason it doesn't work is because the Helm chart by default sets the following arguments.

```
--entrypoints.web.address=:8000/tcp
--entrypoints.websecure.address=:8443/tcp
```

These arguments appear to take precedence, and then ignore the lines referencing 80 and 443. As such the ports 8000 and 8443 are the ones actually provided to Kubernetes and will be the ports that are used as EndPorts in the Traefik LoadBalancer object. I opted to remove the lines using ports 80 and 443, which sets the Docker container to listen to ports 8000 and 8443 which Kubernetes is trying to connect on.

You may also find when using CloudFlare for DNS challenges is that records can take up to 5 minutes to fully propagate. Using a timeout (`CLOUDFLARE_PROPAGATION_TIMEOUT`) of less then 5 minutes may result in the challenge failing. When a challenge fails Traefik will then, helpfully, not attempt to retry it.

## Usage

Now that we have Traefik setup and configured, we can start using it. To do so, we need to create an [`IngressRoute`][traefik-ingressroute] object for the desired service.

[kubernetes/apps/pihole/objects/ingress.yaml][kubernetes-apps-pihole-objects-ingress-yaml]
```
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  creationTimestamp: null
  name: admin-ingress
  namespace: pihole
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host('pihole.lab.alexgardner.id.au')
    kind: Rule
    services:
    - name: pihole-web
      port: 80
  tls:
    certResolver: letsencrypt
```

Once commited, confirm it is synced with ArgoCD and deployed to the Cluster.

```
adminuser@k8s-controller-01:~$ sudo argocd app get pihole-objects --core
Name:               pihole-objects
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          pihole
URL:                http://localhost:45027/applications/pihole-objects
Repo:               https://github.com/eyulf/homelab.git
Target:             main
Path:               kubernetes/apps/pihole/objects
SyncWindow:         Sync Allowed
Sync Policy:        Automated (Prune)
Sync Status:        Synced to main (c41031e)
Health Status:      Healthy

GROUP                KIND          NAMESPACE  NAME            STATUS  HEALTH   HOOK  MESSAGE
traefik.containo.us  IngressRoute  pihole     admin-ingress   Synced                 ingressroute.traefik.containo.us/admin-ingress unchanged
bitnami.com          SealedSecret  pihole     admin-password  Synced  Healthy        sealedsecret.bitnami.com/admin-password unchanged
```

```
adminuser@k8s-controller-01:~$ sudo kubectl describe IngressRoute -n pihole
Name:         admin-ingress
Namespace:    pihole
Labels:       argocd.argoproj.io/instance=pihole-objects
Annotations:  <none>
API Version:  traefik.containo.us/v1alpha1
Kind:         IngressRoute
Metadata:
  Creation Timestamp:  2022-04-23T01:02:10Z
  Generation:          1
  Managed Fields:
    API Version:  traefik.containo.us/v1alpha1
    Fields Type:  FieldsV1
    fieldsV1:
      f:metadata:
        f:annotations:
          .:
          f:kubectl.kubernetes.io/last-applied-configuration:
        f:labels:
          .:
          f:argocd.argoproj.io/instance:
      f:spec:
        .:
        f:entryPoints:
        f:routes:
        f:tls:
          .:
          f:certResolver:
    Manager:         argocd-application-controller
    Operation:       Update
    Time:            2022-04-23T01:02:10Z
  Resource Version:  5349
  UID:               4afdba59-4362-40d6-af2f-ee7a3f697f7d
Spec:
  Entry Points:
    websecure
  Routes:
    Kind:   Rule
    Match:  Host(`pihole.lab.alexgardner.id.au`)
    Services:
      Name:  pihole-web
      Port:  80
  Tls:
    Cert Resolver:  letsencrypt
Events:             <none>
```

We can now confirm that it is accessible, and secured using Let's Encrypt.

```
[user@workstation homelab]$ curl -I pihole.lab.alexgardner.id.au
HTTP/1.1 308 Permanent Redirect
Location: https://pihole.lab.alexgardner.id.au/
Date: Sun, 24 Apr 2022 06:26:49 GMT
Content-Length: 18
Content-Type: text/plain; charset=utf-8

[user@workstation homelab]$ curl -I https://pihole.lab.alexgardner.id.au
HTTP/2 200 
cache-control: max-age=0
content-type: text/html; charset=UTF-8
date: Sun, 24 Apr 2022 06:26:54 GMT
expires: Sun, 24 Apr 2022 06:26:54 GMT
server: lighttpd/1.4.53
x-pi-hole: A black hole for Internet advertisements.

[user@workstation homelab]$ curl -I https://pihole.lab.alexgardner.id.au/admin/
HTTP/2 200 
cache-control: no-store, no-cache, must-revalidate
content-type: text/html; charset=UTF-8
date: Sun, 24 Apr 2022 06:27:28 GMT
expires: Thu, 19 Nov 1981 08:52:00 GMT
pragma: no-cache
server: lighttpd/1.4.53
set-cookie: PHPSESSID=am5rqncthb6v5kdbrtpvjhhli1; path=/; HttpOnly
x-frame-options: DENY
x-pi-hole: The Pi-hole Web interface is working!
```

```
[user@workstation homelab]$ openssl s_client -connect pihole.lab.alexgardner.id.au:443 </dev/null 2>/dev/null | openssl x509 -inform pem -text | head
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            03:53:ec:a3:ba:b0:71:3a:23:b5:26:55:af:ef:f6:83:4c:64
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: C = US, O = Let's Encrypt, CN = R3
        Validity
            Not Before: Apr 24 05:26:00 2022 GMT
            Not After : Jul 23 05:25:59 2022 GMT
```

And finally, the actual Pi-Hole GUI as served from Kubernetes using Traefik with Let's Encrypt SSL.

{% include blog_image.html image="lab-refresh-pihole-gui" format="png" alt="Pi-Hole GUI with Let's Encrypt SSL" %}

## Next Steps

Since we now have domains being served by Kubernetes, one of the next tasks will be having Kubernetes automatically update PowerDNS to set appropriate DNS records using `ExternalDNS`. I'll also need to set up distributed storage so that I can update Traefik to be highly avaliable.


[homelab-refresh-k8s-pihole]: {% link _posts/2022-04-16-home-lab-refresh-kubernetes-pihole.md %}

[k8s-ingress-controller]: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
[wiki-service-mesh]:      https://en.wikipedia.org/wiki/Service_mesh
[wiki-sso]:               https://en.wikipedia.org/wiki/Single_sign-on
[traefik]:                https://traefik.io/traefik/
[lets-encrypt]:           https://letsencrypt.org/
[istio]:                  https://istio.io/
[istio-performance]:      https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
[traefik-docs]:           https://doc.traefik.io/traefik/providers/overview/
[artifacthub]:            https://artifacthub.io/packages/helm/traefik/traefik
[cloudflare]:             https://www.cloudflare.com/
[cloudflare-api-key]:     https://developers.cloudflare.com/api/tokens/create/
[traefik-ingressroute]:   https://doc.traefik.io/traefik/v2.0/routing/providers/kubernetes-crd/

[kubernetes-infrastructure-apps-templates-traefik-yaml]: https://github.com/eyulf/homelab/blob/590f5d0b969e4fbae1ce77d457678ed0bc0b86f6/kubernetes/infrastructure/apps/templates/traefik.yaml
[kubernetes-infrastructure-traefik-chart-yaml]:          https://github.com/eyulf/homelab/blob/590f5d0b969e4fbae1ce77d457678ed0bc0b86f6/kubernetes/infrastructure/traefik/Chart.yaml
[kubernetes-infrastructure-traefik-values-yaml]:         https://github.com/eyulf/homelab/blob/590f5d0b969e4fbae1ce77d457678ed0bc0b86f6/kubernetes/infrastructure/traefik/values.yaml

[kubernetes-infrastructure-traefik-objects-secret-cloudflare-yaml]: https://github.com/eyulf/homelab/blob/baf7726a09cad4aa47e6f14004c9b0c14cf7ea56/kubernetes/infrastructure/traefik/objects/secret-cloudflare.yaml
[kubernetes-infrastructure-traefik-values-yaml2]:                   https://github.com/eyulf/homelab/blob/baf7726a09cad4aa47e6f14004c9b0c14cf7ea56/kubernetes/infrastructure/traefik/values.yaml
[kubernetes-infrastructure-apps-templates-traefik-objects-yaml]:    https://github.com/eyulf/homelab/blob/baf7726a09cad4aa47e6f14004c9b0c14cf7ea56/kubernetes/infrastructure/apps/templates/traefik-objects.yaml

[kubernetes-apps-pihole-objects-ingress-yaml]: https://github.com/eyulf/homelab/blob/ea8e83a1e947ff481fe2a9dfa3c148c847b88aeb/kubernetes/apps/pihole/objects/ingress.yaml
