# 🚀 FishCrewConnect - Deployment & DevOps Guide

## 📋 Table of Contents

1. [Production Environment Setup](#production-environment-setup)
2. [Docker Configuration](#docker-configuration)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Monitoring & Logging](#monitoring--logging)
5. [Backup & Recovery](#backup--recovery)
6. [SSL & Security Configuration](#ssl--security-configuration)
7. [Performance Monitoring](#performance-monitoring)
8. [Scaling Strategies](#scaling-strategies)

---

## 🏗️ Production Environment Setup

### Cloud Infrastructure (AWS Example)

```yaml
# infrastructure/aws-cloudformation.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'FishCrewConnect Production Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues: [staging, production]

Resources:
  # VPC Configuration
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-fishcrewconnect-vpc'

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true

  # Database Subnet Group
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS database
      SubnetIds:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2

  # RDS MySQL Instance
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '${Environment}-fishcrewconnect-db'
      DBInstanceClass: db.t3.micro
      Engine: mysql
      EngineVersion: '8.0'
      MasterUsername: admin
      MasterUserPassword: !Ref DBPassword
      AllocatedStorage: 20
      StorageType: gp2
      DBSubnetGroupName: !Ref DBSubnetGroup
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      BackupRetentionPeriod: 7
      MultiAZ: true
      StorageEncrypted: true

  # Application Load Balancer
  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub '${Environment}-fishcrewconnect-alb'
      Type: application
      Scheme: internet-facing
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref LoadBalancerSecurityGroup

  # ECS Cluster
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub '${Environment}-fishcrewconnect-cluster'
      CapacityProviders:
        - FARGATE
        - FARGATE_SPOT

  # ECS Task Definition
  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub '${Environment}-fishcrewconnect-backend'
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      Cpu: 256
      Memory: 512
      ExecutionRoleArn: !Ref TaskExecutionRole
      ContainerDefinitions:
        - Name: backend
          Image: !Sub '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/fishcrewconnect-backend:latest'
          PortMappings:
            - ContainerPort: 3000
          Environment:
            - Name: NODE_ENV
              Value: production
            - Name: DB_HOST
              Value: !GetAtt Database.Endpoint.Address
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: backend

  # ECS Service
  ECSService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: !Sub '${Environment}-fishcrewconnect-service'
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 2
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          AssignPublicIp: ENABLED
          SecurityGroups:
            - !Ref AppSecurityGroup
          Subnets:
            - !Ref PublicSubnet1
            - !Ref PublicSubnet2
      LoadBalancers:
        - ContainerName: backend
          ContainerPort: 3000
          TargetGroupArn: !Ref TargetGroup
```

### Environment Variables Configuration

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=your-rds-endpoint.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-secure-password
DB_NAME=fishcrewconnect_prod
DB_CONNECTION_LIMIT=10

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-production
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_HOST=smtp.amazonses.com
EMAIL_PORT=587
EMAIL_USER=your-ses-smtp-user
EMAIL_PASS=your-ses-smtp-password

# M-Pesa Configuration (Production)
MPESA_CONSUMER_KEY=your-production-consumer-key
MPESA_CONSUMER_SECRET=your-production-consumer-secret
MPESA_BUSINESS_SHORT_CODE=your-production-short-code
MPESA_PASSKEY=your-production-passkey
MPESA_ENVIRONMENT=production

# Redis Configuration
REDIS_HOST=your-elasticache-endpoint.amazonaws.com
REDIS_PORT=6379

# App Configuration
APP_URL=https://api.fishcrewconnect.com
FRONTEND_URL=https://fishcrewconnect.com

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🐳 Docker Configuration

### Backend Dockerfile

```dockerfile
# Dockerfile.backend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["node", "server.js"]
```

### Frontend Dockerfile

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose for Development

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: fishcrewconnect-mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: fishcrewconnect_dev
      MYSQL_USER: devuser
      MYSQL_PASSWORD: devpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts:/docker-entrypoint-initdb.d
    networks:
      - fishcrewconnect-network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: fishcrewconnect-redis
    ports:
      - "6379:6379"
    networks:
      - fishcrewconnect-network

  # Backend API
  backend:
    build:
      context: ./FishCrewConnect-backend
      dockerfile: Dockerfile
    container_name: fishcrewconnect-backend
    environment:
      NODE_ENV: development
      DB_HOST: mysql
      DB_USER: devuser
      DB_PASSWORD: devpassword
      DB_NAME: fishcrewconnect_dev
      REDIS_HOST: redis
    ports:
      - "3000:3000"
    depends_on:
      - mysql
      - redis
    volumes:
      - ./FishCrewConnect-backend:/app
      - /app/node_modules
    networks:
      - fishcrewconnect-network

  # Frontend (for web version)
  frontend:
    build:
      context: ./FishCrewConnect
      dockerfile: Dockerfile.web
    container_name: fishcrewconnect-frontend
    ports:
      - "19006:19006"
    environment:
      EXPO_DEVTOOLS_LISTEN_ADDRESS: 0.0.0.0
    volumes:
      - ./FishCrewConnect:/app
      - /app/node_modules
    networks:
      - fishcrewconnect-network

volumes:
  mysql_data:

networks:
  fishcrewconnect-network:
    driver: bridge
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy FishCrewConnect

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: fishcrewconnect-backend

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: testpassword
          MYSQL_DATABASE: fishcrewconnect_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: FishCrewConnect-backend/package-lock.json

    - name: Install backend dependencies
      run: |
        cd FishCrewConnect-backend
        npm ci

    - name: Run backend tests
      run: |
        cd FishCrewConnect-backend
        npm test
      env:
        DB_HOST: localhost
        DB_USER: root
        DB_PASSWORD: testpassword
        DB_NAME: fishcrewconnect_test
        JWT_SECRET: test-secret

    - name: Run security audit
      run: |
        cd FishCrewConnect-backend
        npm audit --audit-level moderate

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build, tag, and push backend image to Amazon ECR
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        cd FishCrewConnect-backend
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

    - name: Update ECS service
      run: |
        aws ecs update-service \
          --cluster production-fishcrewconnect-cluster \
          --service production-fishcrewconnect-service \
          --force-new-deployment

    - name: Wait for deployment
      run: |
        aws ecs wait services-stable \
          --cluster production-fishcrewconnect-cluster \
          --services production-fishcrewconnect-service

  deploy-mobile:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: FishCrewConnect/package-lock.json

    - name: Setup Expo CLI
      run: npm install -g @expo/cli

    - name: Install frontend dependencies
      run: |
        cd FishCrewConnect
        npm ci

    - name: Build for production
      run: |
        cd FishCrewConnect
        expo build:android --release-channel production
        expo build:ios --release-channel production
      env:
        EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

    - name: Submit to app stores
      run: |
        cd FishCrewConnect
        expo submit:android
        expo submit:ios
      env:
        EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Starting FishCrewConnect deployment..."

# Variables
ENVIRONMENT=${1:-staging}
AWS_REGION="us-east-1"
CLUSTER_NAME="${ENVIRONMENT}-fishcrewconnect-cluster"
SERVICE_NAME="${ENVIRONMENT}-fishcrewconnect-service"

echo "📋 Environment: $ENVIRONMENT"
echo "🌍 Region: $AWS_REGION"

# Build and push Docker image
echo "🐳 Building Docker image..."
docker build -t fishcrewconnect-backend:latest ./FishCrewConnect-backend

# Tag for ECR
ECR_URI=$(aws ecr describe-repositories --repository-names fishcrewconnect-backend --query 'repositories[0].repositoryUri' --output text)
docker tag fishcrewconnect-backend:latest $ECR_URI:latest

# Push to ECR
echo "📤 Pushing to ECR..."
docker push $ECR_URI:latest

# Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $AWS_REGION

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION

echo "✅ Deployment completed successfully!"

# Run health check
echo "🏥 Running health check..."
LOAD_BALANCER_DNS=$(aws elbv2 describe-load-balancers --names "${ENVIRONMENT}-fishcrewconnect-alb" --query 'LoadBalancers[0].DNSName' --output text)
curl -f http://$LOAD_BALANCER_DNS/health || exit 1

echo "🎉 FishCrewConnect deployed successfully to $ENVIRONMENT!"
```

---

## 📊 Monitoring & Logging

### Application Monitoring Setup

```javascript
// config/monitoring.js
const winston = require('winston');
const CloudWatchLogs = require('winston-cloudwatch');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'fishcrewconnect-backend',
    environment: process.env.NODE_ENV
  },
  transports: [
    // File transport
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Add CloudWatch transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new CloudWatchLogs({
    logGroupName: '/aws/ecs/fishcrewconnect-backend',
    logStreamName: 'backend-logs',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
  }));
}

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

### Health Check Endpoint

```javascript
// routes/healthRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const redis = require('redis');

// Health check endpoint
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Database health check
    await db.query('SELECT 1');
    health.checks.database = { status: 'healthy' };
  } catch (error) {
    health.checks.database = { 
      status: 'unhealthy', 
      error: error.message 
    };
    health.status = 'unhealthy';
  }

  // Redis health check
  try {
    const redisClient = redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    });
    await redisClient.ping();
    health.checks.redis = { status: 'healthy' };
    redisClient.quit();
  } catch (error) {
    health.checks.redis = { 
      status: 'unhealthy', 
      error: error.message 
    };
  }

  // Memory usage check
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  };

  const statusCode = health.status === 'healthy' ? 200 : 500;
  res.status(statusCode).json(health);
});

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    // Get basic metrics
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [jobCount] = await db.query('SELECT COUNT(*) as count FROM jobs');
    const [paymentCount] = await db.query('SELECT COUNT(*) as count FROM job_payments');
    
    const metrics = {
      users_total: userCount[0].count,
      jobs_total: jobCount[0].count,
      payments_total: paymentCount[0].count,
      uptime_seconds: process.uptime(),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

module.exports = router;
```

### CloudWatch Alarms

```yaml
# monitoring/cloudwatch-alarms.yml
Resources:
  HighCPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${Environment}-FishCrewConnect-HighCPU'
      AlarmDescription: 'Alarm when CPU exceeds 70%'
      MetricName: CPUUtilization
      Namespace: AWS/ECS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 70
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: ServiceName
          Value: !Ref ECSService
        - Name: ClusterName
          Value: !Ref ECSCluster
      AlarmActions:
        - !Ref SNSTopic

  HighMemoryAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${Environment}-FishCrewConnect-HighMemory'
      AlarmDescription: 'Alarm when Memory exceeds 80%'
      MetricName: MemoryUtilization
      Namespace: AWS/ECS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: ServiceName
          Value: !Ref ECSService
        - Name: ClusterName
          Value: !Ref ECSCluster
      AlarmActions:
        - !Ref SNSTopic

  DatabaseConnectionsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${Environment}-FishCrewConnect-DatabaseConnections'
      AlarmDescription: 'Alarm when database connections are high'
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 40
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref Database
      AlarmActions:
        - !Ref SNSTopic

  ApplicationErrorsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${Environment}-FishCrewConnect-ApplicationErrors'
      AlarmDescription: 'Alarm when application error rate is high'
      MetricName: ErrorRate
      Namespace: FishCrewConnect/Application
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref SNSTopic
```

---

## 💾 Backup & Recovery

### Database Backup Strategy

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-admin}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-fishcrewconnect}
BACKUP_DIR="/backups/mysql"
S3_BUCKET="fishcrewconnect-backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="fishcrewconnect_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo "🗄️ Starting database backup..."

# Create MySQL dump
mysqldump \
  --host=$DB_HOST \
  --user=$DB_USER \
  --password=$DB_PASSWORD \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --complete-insert \
  --hex-blob \
  $DB_NAME > $BACKUP_PATH

# Compress backup
gzip $BACKUP_PATH
COMPRESSED_FILE="${BACKUP_PATH}.gz"

echo "📦 Backup compressed: $(ls -lh $COMPRESSED_FILE)"

# Upload to S3
if [ ! -z "$S3_BUCKET" ]; then
  echo "☁️ Uploading to S3..."
  aws s3 cp $COMPRESSED_FILE s3://$S3_BUCKET/mysql/$(basename $COMPRESSED_FILE)
  
  # Set lifecycle policy for automatic cleanup
  aws s3api put-object-lifecycle-configuration \
    --bucket $S3_BUCKET \
    --lifecycle-configuration file://s3-lifecycle-policy.json
fi

# Clean up old local backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Database backup completed successfully!"
```

### Recovery Procedures

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

BACKUP_FILE=$1
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-admin}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-fishcrewconnect}

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

echo "⚠️  WARNING: This will restore the database and overwrite existing data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "🔄 Starting database restore..."

# Download from S3 if needed
if [[ $BACKUP_FILE == s3://* ]]; then
  echo "📥 Downloading backup from S3..."
  LOCAL_FILE="/tmp/$(basename $BACKUP_FILE)"
  aws s3 cp $BACKUP_FILE $LOCAL_FILE
  BACKUP_FILE=$LOCAL_FILE
fi

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
  echo "📦 Decompressing backup..."
  gunzip $BACKUP_FILE
  BACKUP_FILE=${BACKUP_FILE%.gz}
fi

# Drop existing database and recreate
echo "🗑️ Dropping existing database..."
mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD -e "DROP DATABASE IF EXISTS $DB_NAME;"
mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD -e "CREATE DATABASE $DB_NAME;"

# Restore from backup
echo "📥 Restoring database..."
mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < $BACKUP_FILE

echo "✅ Database restore completed successfully!"

# Verify restore
echo "🔍 Verifying restore..."
mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT COUNT(*) as user_count FROM users;"
```

---

## 🔒 SSL & Security Configuration

### Nginx SSL Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name api.fishcrewconnect.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.fishcrewconnect.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fishcrewconnect.crt;
    ssl_certificate_key /etc/ssl/private/fishcrewconnect.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO specific configuration
    location /socket.io/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### Security Middleware

```javascript
// middleware/securityMiddleware.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const securityMiddleware = (app) => {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Data sanitization against NoSQL injection
  app.use(mongoSanitize());

  // Data sanitization against XSS
  app.use(xss());

  // Prevent parameter pollution
  app.use(hpp({
    whitelist: ['sort', 'fields', 'page', 'limit']
  }));
};

module.exports = securityMiddleware;
```

---

*This deployment guide provides comprehensive instructions for setting up, deploying, and maintaining the FishCrewConnect platform in production environments.*
