# Comandos da Parte 4

Execute no PowerShell a partir da pasta do projeto. Atualize este arquivo com a ordem que efetivamente executou e substitua os nomes dos pods pelos que aparecerem no seu terminal.

## 1. Escale e volte ao padrão

```powershell
kubectl scale deployment/loja-api --replicas=4 -n n3-solano
kubectl rollout status deployment/loja-api -n n3-solano
kubectl get deployment loja-api -n n3-solano
kubectl scale deployment/loja-api --replicas=2 -n n3-solano
kubectl rollout status deployment/loja-api -n n3-solano
kubectl get deployment loja-api -n n3-solano
```

## 2. Demonstre a atualização

Abra um PowerShell separado e acompanhe o Service enquanto outro terminal atualiza a imagem:

```powershell
kubectl run verifica-rollout --rm -it --restart=Never --image=busybox:1.36 -n n3-solano -- sh -c 'for i in $(seq 1 90); do wget -T 2 -q -O - http://loja-api:3000/health || echo falhou; echo; sleep 1; done'
```

Em `app/server.js`, altere `versao: '1.0'` para `versao: '2.0'`. Depois:

```powershell
docker build -t loja-api:2.0 .\app
kubectl set image deployment/loja-api loja-api=loja-api:2.0 -n n3-solano
kubectl rollout status deployment/loja-api -n n3-solano
kubectl rollout history deployment/loja-api -n n3-solano
```

## 3. Imagem inexistente e rollback

```powershell
kubectl set image deployment/loja-api loja-api=loja-api:versao-inexistente -n n3-solano
kubectl get pods -l app=loja-api -n n3-solano
kubectl describe pod POD_COM_ERRO -n n3-solano
kubectl rollout undo deployment/loja-api -n n3-solano
kubectl rollout status deployment/loja-api -n n3-solano
```

Espere pelo erro de download, capture a seção Events do pod e só então desfaça a atualização.

## 4. Requests e limits

```powershell
kubectl set resources deployment/loja-api -c loja-api --requests=cpu=50m,memory=128Mi --limits=cpu=300m,memory=256Mi -n n3-solano
kubectl rollout status deployment/loja-api -n n3-solano
kubectl get pods -l app=loja-api -n n3-solano
kubectl describe pod POD_NOVO -n n3-solano
```

## 5. HPA

Se `kubectl top pods -n n3-solano` informar que a API de métricas está indisponível, instale o Metrics Server:

```powershell
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl rollout status deployment/metrics-server -n kube-system --timeout=180s
kubectl top pods -n n3-solano
```

Se ainda falhar, inspecione `kubectl logs -n kube-system deployment/metrics-server` e `kubectl describe apiservice v1beta1.metrics.k8s.io`. Quando houver valores, crie o HPA:

```powershell
kubectl autoscale deployment loja-api --min=2 --max=5 --cpu-percent=50 -n n3-solano
kubectl get hpa -n n3-solano -w
```

Em outro PowerShell, inicie carga. A rota de listagem consulta o MySQL e ajuda a aumentar a carga de CPU. Aumente aos poucos se a CPU não alcançar o alvo.

```powershell
kubectl create deployment gerador-carga --image=busybox:1.36 -n n3-solano -- sh -c 'while true; do wget -T 2 -q -O /dev/null http://loja-api:3000/produtos; done'
kubectl scale deployment/gerador-carga --replicas=4 -n n3-solano
kubectl top pods -n n3-solano
```

Depois de capturar o aumento, remova a carga e acompanhe o HPA até voltar a 2. Isso pode levar alguns minutos.

```powershell
kubectl delete deployment gerador-carga -n n3-solano
```

## 6. Nó

```powershell
kubectl describe node
```

Capacity é o total do nó. Allocatable é o que fica disponível para agendar pods. Allocated resources mostra a soma dos requests e limits configurados pelos pods agendados.
