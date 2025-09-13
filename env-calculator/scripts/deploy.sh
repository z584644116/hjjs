#!/bin/bash

# ClawCloud Run 部署脚本
# 使用方法: ./scripts/deploy.sh [环境] [选项]

set -e

# 默认配置
SERVICE_NAME="env-calculator"
DOCKER_IMAGE="env-calculator"
REGION="us-central1"
ENVIRONMENT="production"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
ClawCloud Run 部署脚本

使用方法:
    $0 [选项]

选项:
    -e, --env ENVIRONMENT    部署环境 (development|staging|production)
    -r, --region REGION      部署区域 (默认: us-central1)
    -s, --service SERVICE    服务名称 (默认: env-calculator)
    -i, --image IMAGE        Docker 镜像名称 (默认: env-calculator)
    --build-only            仅构建镜像，不部署
    --deploy-only           仅部署，不构建镜像
    --dry-run               显示将要执行的命令，但不实际执行
    -h, --help              显示此帮助信息

环境变量:
    CLAW_PROJECT_ID         ClawCloud 项目 ID
    CLAW_SERVICE_ACCOUNT_KEY ClawCloud 服务账号密钥
    CLAW_REGION             部署区域
    
示例:
    $0 --env production --region us-central1
    $0 --build-only
    $0 --deploy-only --env staging

EOF
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            -s|--service)
                SERVICE_NAME="$2"
                shift 2
                ;;
            -i|--image)
                DOCKER_IMAGE="$2"
                shift 2
                ;;
            --build-only)
                BUILD_ONLY=true
                shift
                ;;
            --deploy-only)
                DEPLOY_ONLY=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 执行命令（支持 dry-run）
execute_command() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] $1"
    else
        log_info "执行: $1"
        eval "$1"
    fi
}

# 检查必要的工具和环境变量
check_prerequisites() {
    log_info "检查部署前提条件..."

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在 PATH 中"
        exit 1
    fi

    # 检查环境变量
    if [[ -z "$CLAW_PROJECT_ID" ]]; then
        log_warning "CLAW_PROJECT_ID 环境变量未设置"
    fi

    # 检查 ClawCloud CLI（如果需要部署）
    if [[ "$BUILD_ONLY" != "true" ]] && ! command -v claw &> /dev/null; then
        log_warning "ClawCloud CLI 未安装，将尝试使用 Docker 部署"
    fi

    log_success "前提条件检查完成"
}

# 构建 Docker 镜像
build_image() {
    log_info "构建 Docker 镜像..."

    local image_tag="${DOCKER_IMAGE}:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"
    local latest_tag="${DOCKER_IMAGE}:latest"

    execute_command "docker build -t $image_tag -t $latest_tag ."

    if [[ "$DRY_RUN" != "true" ]]; then
        log_success "镜像构建完成: $image_tag"
    fi

    echo "$image_tag"
}

# 部署到 ClawCloud Run
deploy_to_clawcloud() {
    local image_tag="$1"
    
    log_info "部署到 ClawCloud Run..."

    # 环境变量配置
    local env_vars="NODE_ENV=$ENVIRONMENT,CLAW_CLOUD_RUN=true"
    
    if command -v claw &> /dev/null; then
        # 使用 ClawCloud CLI
        execute_command "claw run deploy $SERVICE_NAME \
            --image $image_tag \
            --region $REGION \
            --set-env-vars=\"$env_vars\" \
            --memory=512Mi \
            --cpu=0.5 \
            --max-instances=10 \
            --port=3000 \
            --allow-unauthenticated"
    else
        # 使用 Docker 部署（如果支持）
        log_warning "ClawCloud CLI 不可用，尝试使用配置文件部署"
        
        # 更新配置文件
        if [[ -f "clawcloud.yml" ]]; then
            execute_command "sed -i 's|image:.*|image: $image_tag|g' clawcloud.yml"
            execute_command "kubectl apply -f clawcloud.yml"
        else
            log_error "找不到 clawcloud.yml 配置文件"
            exit 1
        fi
    fi

    if [[ "$DRY_RUN" != "true" ]]; then
        log_success "部署完成"
    fi
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."

    # 等待部署完成
    sleep 30

    # 尝试获取服务 URL
    local service_url
    if command -v claw &> /dev/null; then
        service_url=$(claw run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>/dev/null || echo "")
    fi

    if [[ -z "$service_url" ]]; then
        service_url="https://$SERVICE_NAME.clawcloud.run"
        log_warning "无法获取服务 URL，使用默认: $service_url"
    fi

    log_info "测试服务: $service_url"

    # 健康检查
    if curl -f "$service_url/api/health" --max-time 30 --silent > /dev/null; then
        log_success "健康检查通过"
    else
        log_error "健康检查失败"
        return 1
    fi

    # 存储 API 测试
    if curl -f "$service_url/api/storage?key=test&userId=test" --max-time 30 --silent > /dev/null; then
        log_success "存储 API 可访问"
    else
        log_warning "存储 API 测试失败（可能是预期的）"
    fi

    log_success "部署验证完成: $service_url"
}

# 主函数
main() {
    log_info "开始 ClawCloud Run 部署流程"
    log_info "环境: $ENVIRONMENT | 区域: $REGION | 服务: $SERVICE_NAME"

    parse_args "$@"
    check_prerequisites

    local image_tag=""

    # 构建阶段
    if [[ "$DEPLOY_ONLY" != "true" ]]; then
        image_tag=$(build_image)
    else
        image_tag="${DOCKER_IMAGE}:latest"
        log_info "跳过构建，使用镜像: $image_tag"
    fi

    # 部署阶段
    if [[ "$BUILD_ONLY" != "true" ]]; then
        deploy_to_clawcloud "$image_tag"
        
        if [[ "$DRY_RUN" != "true" ]]; then
            verify_deployment
        fi
    else
        log_info "仅构建模式，跳过部署"
    fi

    log_success "部署流程完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，退出码: $?"' ERR

# 执行主函数
main "$@"
