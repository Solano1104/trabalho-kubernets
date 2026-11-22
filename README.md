# Loja N3

API Node.js criada para a Atividade N3. O MySQL guarda os produtos e o Redis mantém por 60 segundos o resultado da consulta por ID. Use senhas fictícias neste laboratório.

| Método | Rota | Resultado |
|---|---|---|
| GET | /health | Status da API e versão |
| GET | /ready | Verifica MySQL e Redis |
| POST | /produtos | Cadastra um produto |
| GET | /produtos | Lista os 100 produtos mais recentes |
| GET | /produtos/{id} | Consulta o produto, com cabeçalho X-Cache |

## 1. Docker e Compose

Extraia os arquivos. Abra o PowerShell na pasta que contém este README. Inicie o Docker Desktop e execute:

```powershell
Copy-Item .env.example .env
docker build -t loja-api:1.0 .\app
docker compose up -d --wait
docker compose ps
Invoke-RestMethod http://localhost:3000/health
```

Para testar a imagem em um container avulso com as mesmas variáveis e a mesma rede:

```powershell
docker compose run --rm -p 127.0.0.1:3001:3000 api
```

Acesse `http://localhost:3001/health` em outro PowerShell e encerre o container avulso com Ctrl+C.

### Cadastre e consulte

```powershell
$api = 'http://localhost:3000'
$produto = Invoke-RestMethod -Method Post -Uri "$api/produtos" -ContentType 'application/json' -Body '{"nome":"Camiseta Sharks","preco":59.90}'
$produto
curl.exe -i "$api/produtos/$($produto.id)"
curl.exe -i "$api/produtos/$($produto.id)"
```

As duas consultas seguidas devem mostrar X-Cache MISS e depois HIT. Para a prova de persistência, consulte a lista, que lê diretamente o MySQL:

```powershell
Invoke-RestMethod "$api/produtos"
docker compose down
docker compose up -d --wait
Invoke-RestMethod "$api/produtos"
```

Guarde a saída antes e depois com o mesmo ID. O comando `down -v` apaga o volume.

## 2. Kubernetes no Docker Desktop

Na tela **Modify Kubernetes Cluster**, selecione **Kubeadm** e clique em **Save changes**. A troca pode recriar o cluster e apagar os recursos existentes. Confira o nó Ready, a classe de armazenamento padrão e suba os manifests:

```powershell
kubectl config use-context docker-desktop
kubectl get nodes
kubectl get storageclass
kubectl apply -f .\k8s\00-namespace.yaml
kubectl apply -f .\k8s\
kubectl get all -n n3-solano
kubectl get pvc -n n3-solano
kubectl rollout status deployment/loja-api -n n3-solano --timeout=240s
kubectl port-forward service/loja-api 8080:3000 -n n3-solano
```

Deixe o port-forward aberto. Em outro PowerShell, execute o cadastro e a consulta da seção anterior usando `$api = 'http://localhost:8080'`. O Compose e o Kubernetes têm bancos separados. Registre o produto criado no Kubernetes e prove a persistência usando a rota de listagem:

```powershell
Invoke-RestMethod "$api/produtos"
kubectl delete pod -l app=mysql -n n3-solano
kubectl rollout status deployment/mysql -n n3-solano --timeout=180s
kubectl get pods,pvc -n n3-solano
Invoke-RestMethod "$api/produtos"
```

Se o port-forward fechar, execute-o novamente. Se a imagem local der ImagePullBackOff, verifique os eventos com `kubectl describe pod POD -n n3-solano`. Se necessário, publique as imagens em um registro acessível pelo cluster e use o nome completo no YAML e nos comandos de atualização. Se o PVC ficar Pending, confira a classe padrão e os eventos com `kubectl describe pvc mysql-data -n n3-solano`.

## 3. Evidências e entrega

Siga [comandos.md](comandos.md) para fazer os seis testes operacionais. Registre no PDF:

- `kubectl get all -n n3-solano`
- `kubectl describe deployment loja-api -n n3-solano`
- `kubectl rollout history deployment/loja-api -n n3-solano`
- `kubectl get hpa -n n3-solano -w` antes, durante e depois da carga
- `kubectl top pods -n n3-solano`
- `kubectl describe node`

Inclua também as provas de persistência e os resultados de escala, atualização, diagnóstico e rollback. Faça a capa com nome, turma e data. Responda com suas palavras às oito perguntas do enunciado, usando as saídas dos seus testes.

Publique a pasta em um repositório GitHub. Se o repositório for privado, dê acesso ao professor. Confira se o Git incluiu `.env.example` e ignorou `.env`. Entregue o link e o PDF conforme a orientação do professor.
