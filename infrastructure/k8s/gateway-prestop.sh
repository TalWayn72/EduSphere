#!/bin/sh
# Gateway preStop hook for Kubernetes rolling updates.
#
# When a pod enters Terminating state, kube-proxy may still route traffic
# to it for a few seconds until the Endpoints object propagates.
# This sleep gives the load balancer time to remove the pod from its
# target list before SIGTERM triggers the application-level graceful
# shutdown (WebSocket drain + NATS cleanup).
#
# Usage in pod spec:
#   lifecycle:
#     preStop:
#       exec:
#         command: ["/bin/sh", "/app/infrastructure/k8s/gateway-prestop.sh"]
#
# The 5s sleep is intentionally shorter than the gateway's 30s drain timeout
# so that the total shutdown window fits within the default Kubernetes
# terminationGracePeriodSeconds (30s): 5s preStop + up to 25s app drain.

echo "[prestop] sleeping 5s to allow load balancer deregistration"
sleep 5
echo "[prestop] sleep complete — SIGTERM will follow"
