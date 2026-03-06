# gVisor Agent Sandbox Setup

## Why gVisor?

EduSphere uses gVisor (runsc) to sandbox the `subgraph-agent` container, which executes
AI-generated code and LLM tool calls on behalf of multiple tenants. gVisor intercepts
kernel syscalls through a user-space kernel, preventing container escapes and limiting
the blast radius of a compromised agent execution.

## Installation (Ubuntu/Debian)

```bash
# Add gVisor package repository
curl -fsSL https://gvisor.dev/archive.key | sudo gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" | sudo tee /etc/apt/sources.list.d/gvisor.list

sudo apt-get update && sudo apt-get install -y runsc
```

## Docker Daemon Configuration

Add to `/etc/docker/daemon.json`:

```json
{
  "runtimes": {
    "runsc": {
      "path": "/usr/sbin/runsc"
    }
  }
}
```

Then restart Docker:

```bash
sudo systemctl restart docker
```

## Apply to EduSphere

```bash
docker-compose -f docker-compose.yml -f docker-compose.gvisor.yml up -d
```

## Services Using gVisor

| Service           | gVisor  | Reason                                          |
| ----------------- | ------- | ----------------------------------------------- |
| `subgraph-agent`  | YES     | Executes LLM tool calls and AI-generated code   |
| `postgres`        | NO      | Performance-critical; no user code execution    |
| `redis`           | NO      | Performance-critical; no user code execution    |
| `nats`            | NO      | Message routing only; no user code execution    |
| `keycloak`        | NO      | Auth server; no user code execution             |
| `minio`           | NO      | Object storage; no user code execution          |

## Kubernetes RuntimeClass

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
---
# In agent Deployment spec.template.spec:
runtimeClassName: gvisor
```

## Verification

```bash
# Verify runsc binary is installed
runsc --version

# Run a test container with gVisor
docker run --runtime=runsc --rm hello-world
# Should print "Hello from Docker!" using gVisor runtime

# Confirm gVisor is intercepting syscalls (dmesg shows "runsc" entries)
docker run --runtime=runsc --rm ubuntu uname -r
# Returns gVisor kernel version, not host kernel
```

## Performance Considerations

gVisor adds overhead to syscall-heavy workloads (file I/O, network). For the agent
subgraph, the tradeoff is acceptable: LLM inference latency dominates over syscall
overhead, and security isolation for multi-tenant AI execution is non-negotiable.

Expect 5-15% throughput reduction vs runc for typical agent workloads.

## Troubleshooting

| Error                                         | Cause                                              | Fix                                                      |
| --------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `unknown runtime specified: runsc`            | gVisor not installed or daemon not restarted       | Install `runsc`, update `daemon.json`, restart Docker    |
| `OCI runtime exec failed: runsc`              | gVisor version incompatible with kernel            | Upgrade gVisor: `apt-get install --only-upgrade runsc`   |
| Container hangs on start                      | gVisor KVM mode requires nested virt in VM         | Use `--platform=systrap` in runsc flags                  |
| `permission denied /dev/kvm`                  | Host does not expose KVM to Docker                 | Add `--device /dev/kvm` or switch to systrap mode        |

## References

- [gVisor documentation](https://gvisor.dev/docs/)
- [Docker runtime configuration](https://docs.docker.com/engine/alternative-runtimes/)
- [EduSphere Security Plan](./SECURITY_PLAN.md)
