# Deployment Overview

This guide covers deploying the ZuriHealth HMS API on an EC2 instance with comprehensive documentation served at `/docs`.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   EC2 Instance  │    │   PostgreSQL    │
│     (Nginx)     │────│   (Node.js)     │────│    Database     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │  Documentation  │              │
         └──────────────│   (Docusaurus)  │──────────────┘
                        └─────────────────┘
```

## Deployment Components

### 1. Main API Server
- **Technology**: Node.js with Express
- **Port**: 3000 (internal)
- **Features**: Full HMS API functionality

### 2. Documentation Site
- **Technology**: Docusaurus
- **Path**: `/docs`
- **Features**: Complete API documentation

### 3. Database
- **Technology**: PostgreSQL
- **Features**: Patient data, medical records, etc.

### 4. Reverse Proxy
- **Technology**: Nginx
- **Features**: SSL termination, load balancing

## Deployment Environments

### Development
- **Purpose**: Local development and testing
- **Database**: Local PostgreSQL
- **Documentation**: Hot reload enabled
- **SSL**: Not required

### Staging
- **Purpose**: Pre-production testing
- **Database**: Staging PostgreSQL
- **Documentation**: Built and served statically
- **SSL**: Let's Encrypt

### Production
- **Purpose**: Live system
- **Database**: Production PostgreSQL with backups
- **Documentation**: Optimized build
- **SSL**: Commercial certificate or Let's Encrypt
- **Monitoring**: Full monitoring stack

## Infrastructure Requirements

### EC2 Instance Specifications

#### Minimum Requirements
- **Instance Type**: t3.medium
- **vCPUs**: 2
- **RAM**: 4 GB
- **Storage**: 20 GB SSD
- **Network**: Enhanced networking

#### Recommended for Production
- **Instance Type**: t3.large or c5.large
- **vCPUs**: 2-4
- **RAM**: 8-16 GB
- **Storage**: 50-100 GB SSD
- **Network**: Enhanced networking
- **Backup**: EBS snapshots

### Database Requirements

#### PostgreSQL Specifications
- **Version**: 13.x or higher
- **Storage**: 50-200 GB (depending on data volume)
- **Backup**: Daily automated backups
- **Monitoring**: Performance insights enabled

## Security Considerations

### Network Security
- **VPC**: Deploy in private subnet
- **Security Groups**: Restrict access to necessary ports
- **SSL/TLS**: HTTPS only for all communications
- **Firewall**: UFW or iptables configuration

### Application Security
- **Environment Variables**: Secure storage of secrets
- **JWT Tokens**: Secure key management
- **Rate Limiting**: Implemented at application level
- **Input Validation**: All inputs validated and sanitized

### Database Security
- **Encryption**: At rest and in transit
- **Access Control**: Role-based database access
- **Backup Encryption**: Encrypted backups
- **Network Isolation**: Database in private subnet

## Monitoring and Logging

### Application Monitoring
- **Health Checks**: `/health` endpoint
- **Performance Metrics**: Response times, throughput
- **Error Tracking**: Centralized error logging
- **Uptime Monitoring**: External monitoring service

### Infrastructure Monitoring
- **System Metrics**: CPU, memory, disk usage
- **Network Metrics**: Bandwidth, latency
- **Database Metrics**: Connection pool, query performance
- **Log Aggregation**: Centralized logging

## Backup Strategy

### Database Backups
- **Frequency**: Daily automated backups
- **Retention**: 30 days for daily, 12 months for monthly
- **Testing**: Regular backup restoration tests
- **Storage**: Encrypted S3 storage

### Application Backups
- **Code**: Git repository with tags
- **Configuration**: Environment-specific configs
- **Documentation**: Version-controlled docs
- **Certificates**: SSL certificate backups

## Scaling Considerations

### Horizontal Scaling
- **Load Balancer**: Application Load Balancer (ALB)
- **Auto Scaling**: EC2 Auto Scaling Groups
- **Database**: Read replicas for read-heavy workloads
- **Session Management**: Stateless application design

### Vertical Scaling
- **Instance Upgrades**: Easy instance type changes
- **Database Scaling**: RDS instance scaling
- **Storage Scaling**: EBS volume expansion
- **Memory Optimization**: Application-level caching

## Disaster Recovery

### Recovery Time Objectives (RTO)
- **Critical Systems**: 1 hour
- **Non-Critical Systems**: 4 hours
- **Documentation**: 15 minutes

### Recovery Point Objectives (RPO)
- **Database**: 1 hour (continuous backup)
- **Application**: Immediate (Git-based)
- **Configuration**: Immediate (Infrastructure as Code)

### Disaster Recovery Plan
1. **Assessment**: Determine scope of outage
2. **Communication**: Notify stakeholders
3. **Recovery**: Execute recovery procedures
4. **Validation**: Verify system functionality
5. **Post-Mortem**: Document lessons learned

## Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates obtained
- [ ] DNS records configured
- [ ] Monitoring setup completed
- [ ] Backup procedures tested

### Deployment
- [ ] Code deployed to server
- [ ] Database migrations executed
- [ ] Documentation built and deployed
- [ ] Services started and verified
- [ ] Health checks passing
- [ ] SSL configuration verified

### Post-Deployment
- [ ] Smoke tests completed
- [ ] Monitoring alerts configured
- [ ] Performance baseline established
- [ ] Documentation updated
- [ ] Team notified of deployment
- [ ] Rollback plan confirmed

## Next Steps

1. **[Requirements](./requirements.md)** - Detailed system requirements
2. **[Environment Setup](./environment-setup.md)** - Environment configuration
3. **[Database Setup](./database-setup.md)** - PostgreSQL configuration
4. **[EC2 Deployment](./ec2-deployment.md)** - Step-by-step deployment
5. **[Nginx Configuration](./nginx-configuration.md)** - Reverse proxy setup
6. **[SSL Setup](./ssl-setup.md)** - HTTPS configuration
7. **[Monitoring](./monitoring.md)** - Monitoring and alerting
8. **[Maintenance](./maintenance.md)** - Ongoing maintenance tasks