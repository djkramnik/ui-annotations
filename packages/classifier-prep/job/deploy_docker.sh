#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY_ENV_FILE="${PROJECT_DIR}/.env.deploy"

if [[ -f "${DEPLOY_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${DEPLOY_ENV_FILE}"
  set +a
else
  echo "WARNING: ${DEPLOY_ENV_FILE} not found."
  echo "Create it from .env.deploy.example before running deploy_docker.sh."
  exit 1
fi

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
ECR_REPOSITORY="${AWS_ECR_REPOSITORY:-classifier-prep}"
IMAGE_TAG="${AWS_SAGEMAKER_IMAGE_TAG:-latest}"
AWS_DEBUG="${AWS_DEBUG:-false}"

aws_cli() {
  if [[ -n "${AWS_PROFILE}" ]]; then
    aws --profile "${AWS_PROFILE}" "$@"
  else
    aws "$@"
  fi
}

log_context() {
  local caller_arn
  caller_arn="$(aws_cli sts get-caller-identity --query Arn --output text 2>/dev/null || echo "unknown")"
  echo "Deploy context:"
  echo "  profile: ${AWS_PROFILE:-<default>}"
  echo "  region: ${AWS_REGION}"
  echo "  account_id: ${AWS_ACCOUNT_ID}"
  echo "  caller_arn: ${caller_arn}"
  echo "  ecr_repository: ${ECR_REPOSITORY}"
  echo "  image_tag: ${IMAGE_TAG}"
}

if [[ "${AWS_DEBUG}" == "true" ]]; then
  set -x
fi

if [[ -z "${AWS_ACCOUNT_ID}" ]]; then
  AWS_ACCOUNT_ID="$(aws_cli sts get-caller-identity --query Account --output text)"
fi

if [[ -z "${AWS_ACCOUNT_ID}" || "${AWS_ACCOUNT_ID}" == "None" ]]; then
  echo "Unable to resolve AWS account ID. Set AWS_ACCOUNT_ID or configure AWS credentials."
  exit 1
fi

IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"

log_context

echo "Ensuring ECR repository exists: ${ECR_REPOSITORY}"
if ! aws_cli ecr describe-repositories \
  --repository-names "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" >/dev/null; then
  echo "Repository not found or inaccessible; attempting create-repository."
  aws_cli ecr create-repository \
    --repository-name "${ECR_REPOSITORY}" \
    --region "${AWS_REGION}" >/dev/null
fi

echo "Logging into ECR (${AWS_REGION})"
aws_cli ecr get-login-password --region "${AWS_REGION}" | \
docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building Docker image from ${PROJECT_DIR}/job/Dockerfile"
docker build -t "${ECR_REPOSITORY}:${IMAGE_TAG}" -f "${PROJECT_DIR}/job/Dockerfile" "${PROJECT_DIR}/job"

echo "Tagging image: ${IMAGE_URI}"
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${IMAGE_URI}"

echo "Pushing image: ${IMAGE_URI}"
docker push "${IMAGE_URI}"

echo "Image pushed successfully."
echo "Set AWS_SAGEMAKER_IMAGE_URI=${IMAGE_URI}"
