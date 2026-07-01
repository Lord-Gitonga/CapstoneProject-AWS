# CI/CD Pipeline Documentation for Amazon ECS using CodePipeline

## Overview

This project uses a fully automated Continuous Integration and Continuous Deployment (CI/CD) pipeline on AWS to build, package, and deploy a Dockerized application to Amazon ECS running on AWS Fargate.

The deployment workflow consists of the following AWS services:

* Amazon Elastic Container Registry (ECR)
* AWS CodeCommit / GitHub (Source Repository)
* AWS CodeBuild
* AWS CodePipeline
* AWS CodeDeploy
* Amazon ECS (Fargate)
* Elastic Load Balancer (Application Load Balancer)
* Amazon CloudWatch Logs

---

# Architecture

```
Developer
     │
     ▼
GitHub / CodeCommit
     │
     ▼
CodePipeline
     │
     ▼
CodeBuild
     │
     ├────────────► Build Docker Image
     │
     ├────────────► Push Image to Amazon ECR
     │
     └────────────► Generate Deployment Artifacts
                     • imageDetail.json
                     • appspec.yml
                     • taskdef.json
     │
     ▼
CodeDeploy (ECS Blue/Green)
     │
     ├────────────► Register New Task Definition
     ├────────────► Create Replacement Task Set
     ├────────────► Validate Health Checks
     └────────────► Shift Traffic
     │
     ▼
Amazon ECS Service (Fargate)
     │
     ▼
Application Load Balancer
     │
     ▼
Users
```

---

# Prerequisites

Before creating the pipeline, ensure the following resources exist.

## 1. Dockerized Application

Your application should include:

* Dockerfile
* package.json (or equivalent)
* Source code

---

## 2. Amazon ECR Repository

Create an ECR repository to store Docker images.

Example:

```
myapp-production
```

Example login command:

```bash
aws ecr get-login-password \
| docker login \
--username AWS \
--password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com
```

---

## 3. Amazon ECS Cluster

Create an ECS Cluster using Fargate.

Example:

```
myapp-production-cluster
```

---

## 4. ECS Task Definition

Create a task definition.

Example:

```json
{
  "family": "myapp-task-production",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "3072",
  "executionRoleArn": "...",
  "taskRoleArn": "...",
  "containerDefinitions": [
    {
      "name": "myapp",
      "image": "<IMAGE1_NAME>",
      "portMappings": [
        {
          "containerPort": 3000
        }
      ]
    }
  ]
}
```

The image placeholder **must remain**:

```
<IMAGE1_NAME>
```

It is automatically replaced by CodeDeploy.

---

## 5. ECS Service

Create an ECS Service.

Example:

```
myapp-service
```

Deployment Controller:

```
CODE_DEPLOY
```

Launch Type:

```
Fargate
```

---

## 6. Application Load Balancer

Create an Application Load Balancer with:

* Production Listener
* Test Listener
* Production Target Group
* Test Target Group

These are required for Blue/Green deployments.

---

# Step 1 — Create CodeBuild Project

Create a CodeBuild project.

Example environment:

```
Operating System:
Amazon Linux

Runtime:
Standard

Privileged:
Enabled
```

Privileged mode must be enabled to allow Docker builds.

---

## buildspec.yml

CodeBuild performs the following:

* Login to Amazon ECR
* Build Docker image
* Tag image
* Push image
* Generate deployment artifacts

Artifacts produced:

```
imageDetail.json
appspec.yml
taskdef.json
```

---

# Step 2 — Configure Amazon ECR

During CodeBuild:

```
Docker Build
        │
        ▼
Docker Tag
        │
        ▼
Docker Push
        │
        ▼
Amazon ECR
```

The image is tagged using the Git commit hash.

Example:

```
myapp:7d93ab4
```

---<img width="1858" height="433" alt="Screenshot From 2026-07-01 22-22-24" src="https://github.com/user-attachments/assets/9f9cb197-c075-45f3-a99f-4fa5b4faa206" />
<img width="1816" height="748" alt="Screenshot From 2026-07-01 22-21-07" src="https://github.com/user-attachments/assets/4d8f8da9-2334-4543-974d-56fc3acc6fdf" />
<img width="1822" height="395" alt="Screenshot From 2026-07-01 22-20-19" src="https://github.com/user-attachments/assets/2c6e41d6-cb75-4a1f-952d-b755a1ecfe7a" />
<img width="1821" height="731" alt="Screenshot From 2026-07-01 22-18-10" src="https://github.com/user-attachments/assets/555ba2ec-9a4f-4312-8b91-2861bd349207" />



# Step 3 — Deployment Artifacts

## imageDetail.json

Generated automatically.

Example:

```json
{
    "ImageURI": "<ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/myapp:7d93ab4"
}
```

---

## taskdef.json

Template task definition.

Example:

```json
{
    "family": "myapp-task-production",
    "containerDefinitions": [
        {
            "name": "myapp",
            "image": "<IMAGE1_NAME>"
        }
    ]
}
```

---

## appspec.yml

Example:

```yaml
version: 0.0

Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: myapp
          ContainerPort: 3000
```

---

# Step 4 — Create CodeDeploy Application

Create:

```
Compute Platform:
Amazon ECS
```

Create a Deployment Group.

Configure:

* ECS Cluster
* ECS Service
* Production Listener
* Test Listener
* Target Group (Blue)
* Target Group (Green)

Deployment Type:

```
Blue/Green
```

Traffic Routing:

```
All-at-once
```

(or choose Canary/Linear if desired).

---

# Step 5 — Create CodePipeline

Pipeline stages:

## Source

Choose:

* GitHub
* CodeCommit
* Bitbucket

Output:

```
Source Artifact
```

---

## Build

Provider:

```
AWS CodeBuild
```

Input:

```
Source Artifact
```

Output:

```
Build Artifact
```

---

## Deploy

Provider:

```
CodeDeploy to Amazon ECS
```

Configure:

Application:

```
myapp-production
```

Deployment Group:

```
myapp-production-group
```

Input Artifact:

```
Build Artifact
```

Task Definition:

```
taskdef.json
```

AppSpec File:

```
appspec.yml
```

Image Definitions:

```
imageDetail.json
```

---

# Deployment Flow

```
Developer Pushes Code
        │
        ▼
GitHub
        │
        ▼
CodePipeline
        │
        ▼
CodeBuild
        │
        ├── Build Docker Image
        ├── Push Image to Amazon ECR
        ├── Generate taskdef.json
        ├── Generate imageDetail.json
        └── Generate appspec.yml
        │
        ▼
CodeDeploy
        │
        ├── Replace <IMAGE1_NAME>
        ├── Register New Task Definition
        ├── Create Green Task Set
        ├── Perform Health Checks
        ├── Shift Production Traffic
        └── Remove Old Task Set
        │
        ▼
Amazon ECS Service
        │
        ▼
Application Load Balancer
        │
        ▼
Users
```

---

# Rollback

If deployment fails:

* Health checks fail
* ECS tasks become unhealthy
* Application fails to start

CodeDeploy automatically:

* Stops traffic shifting
* Restores the previous task set
* Keeps the previous version running

No manual intervention is required.

---

# Monitoring

Monitor deployments using:

* Amazon CloudWatch Logs
* Amazon ECS Console
* CodeBuild Logs
* CodePipeline Execution History
* CodeDeploy Deployment History
* Application Load Balancer Target Health

---

# Best Practices

* Enable automatic rollback on deployment failures.
* Tag Docker images using commit hashes instead of `latest`.
* Store secrets in AWS Secrets Manager or AWS Systems Manager Parameter Store.
* Use IAM roles with the principle of least privilege.
* Enable CloudWatch logging for ECS tasks.
* Scan container images in Amazon ECR.
* Configure CloudWatch alarms to monitor deployment health.
* Keep separate environments (Development, Staging, and Production) with independent pipelines.

---

# Troubleshooting

### INVALID_REVISION

Possible causes:

* Missing `taskdef.json`
* Invalid `appspec.yml`
* Incorrect container name
* Incorrect container port
* Missing deployment artifacts
* Incorrect CodeDeploy deployment group configuration

### ECS Tasks Not Starting

Check:

* ECS task logs
* CloudWatch Logs
* Security Groups
* IAM Roles
* Environment variables
* Container health checks

### Image Pull Failures

Verify:

* ECR repository exists
* IAM execution role permissions
* Docker image was pushed successfully
* Image URI is correct

---

# Conclusion

This CI/CD pipeline provides a fully automated deployment workflow for containerized applications on Amazon ECS using AWS Fargate. Every code commit triggers a new build, pushes a versioned Docker image to Amazon ECR, and performs a Blue/Green deployment through CodeDeploy, enabling zero-downtime releases, automated traffic shifting, health validation, and rollback capabilities.
