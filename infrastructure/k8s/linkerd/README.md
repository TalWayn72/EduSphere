# Linkerd mTLS for EduSphere

This directory contains Linkerd service mesh configuration that enforces mutual TLS (mTLS)
for all inter-service communication within the `edusphere` Kubernetes namespace.

## Why mTLS

All traffic between EduSphere subgraphs, the gateway, and backing services must be encrypted
and mutually authenticated. Plaintext inter-service HTTP is prohibited (Security Invariant SI-6).
Linkerd provides zero-config mTLS via its proxy sidecar — no certificate management required.

## Prerequisites

- Kubernetes 1.26+
- Linkerd CLI 2.14+ (`brew install linkerd` or https://linkerd.io/2/getting-started/)
- `kubectl` configured against the target cluster

## Installation

### 1. Install Linkerd control plane

```bash
# Validate cluster compatibility
linkerd check --pre

# Install CRDs
linkerd install --crds | kubectl apply -f -

# Install control plane
linkerd install | kubectl apply -f -

# Wait for control plane to be ready
linkerd check
```

### 2. Apply EduSphere namespace annotations

```bash
kubectl apply -f infrastructure/k8s/linkerd/namespace-annotations.yaml
```

This enables automatic proxy injection for all pods in the `edusphere` namespace.
**Restart existing deployments** to inject the proxy into running pods:

```bash
kubectl rollout restart deployment -n edusphere
```

### 3. Apply ServerAuthorization policies

```bash
kubectl apply -f infrastructure/k8s/linkerd/server-policies.yaml -n edusphere
```

Each subgraph's `Server` resource defines which port accepts traffic, and the
corresponding `ServerAuthorization` restricts callers to the gateway service account
(and peer subgraphs where cross-calls are expected).

### 4. Apply mTLS enforcement policy

```bash
kubectl apply -f infrastructure/k8s/linkerd/mtls-test.yaml -n edusphere
```

This applies a namespace-wide `AuthorizationPolicy` that denies all non-mTLS traffic.

## Verification

### Check proxy injection

```bash
# Verify all pods have the linkerd-proxy sidecar
kubectl get pods -n edusphere -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep linkerd-proxy
```

### Verify mTLS is active on all edges

```bash
# Show all edges — every row should show "secured" under TLS column
linkerd viz edges -n edusphere

# Expected output (example):
# SRC                    DST                  SRC_NS      DST_NS      SECURED
# edusphere-gateway      subgraph-core        edusphere   edusphere   √
# edusphere-gateway      subgraph-content     edusphere   edusphere   √
# ...
```

### Run the full Linkerd health check

```bash
linkerd check --proxy -n edusphere
```

All checks must pass. Any failing check indicates a misconfigured proxy or policy.

### Inspect traffic statistics

```bash
# Per-route success rates, latencies
linkerd viz stat deploy -n edusphere

# Top live requests
linkerd viz top deploy/subgraph-core -n edusphere
```

### Verify ServerAuthorization is enforced

```bash
# Attempt to reach subgraph-core from an unauthorized pod — should be rejected
kubectl run test-unauthorized --image=curlimages/curl --restart=Never -n edusphere -- \
  curl -s http://subgraph-core:4001/graphql

# Logs should show: "Connection refused" or proxy policy rejection
kubectl logs test-unauthorized -n edusphere
kubectl delete pod test-unauthorized -n edusphere
```

## Policy Matrix

| Source              | Destination           | Allowed |
|---------------------|-----------------------|---------|
| edusphere-gateway   | subgraph-core (4001)  | Yes     |
| edusphere-gateway   | subgraph-content (4002) | Yes   |
| edusphere-gateway   | subgraph-annotation (4003) | Yes |
| edusphere-gateway   | subgraph-collaboration (4004) | Yes |
| edusphere-gateway   | subgraph-agent (4005) | Yes     |
| edusphere-gateway   | subgraph-knowledge (4006) | Yes |
| subgraph-core       | subgraph-collaboration (4004) | Yes |
| subgraph-knowledge  | subgraph-agent (4005) | Yes     |
| subgraph-agent      | subgraph-knowledge (4006) | Yes |
| Any other source    | Any subgraph          | No (denied) |

## Troubleshooting

**Pods not injected:**
Ensure the `linkerd.io/inject: enabled` annotation is on the Namespace (not just the Pod).
Run `kubectl rollout restart deployment -n edusphere` after applying namespace annotations.

**`linkerd viz edges` shows unencrypted traffic:**
A pod may be running without the proxy. Check `kubectl describe pod <name> -n edusphere`
for the `linkerd-proxy` container. If absent, the pod predates the namespace annotation.

**ServerAuthorization not blocking:**
Verify Linkerd version supports `policy.linkerd.io/v1beta2`. Run `linkerd version`.
For Linkerd 2.12 or earlier, use `v1alpha1` ServerAuthorization resources instead.
