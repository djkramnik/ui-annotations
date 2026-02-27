#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REPOSITORY="${AWS_ECR_REPOSITORY:-classifier-prep}"
IMAGE_TAG="${AWS_SAGEMAKER_IMAGE_TAG:-latest}"

if [[ -z "${AWS_ACCOUNT_ID}" || "${AWS_ACCOUNT_ID}" == "None" ]]; then
  echo "Unable to resolve AWS account ID. Set AWS_ACCOUNT_ID or configure AWS credentials."
  exit 1
fi

IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo "Ensuring ECR repository exists: ${ECR_REPOSITORY}"
aws ecr describe-repositories \
  --repository-names "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" >/dev/null 2>&1 || \
aws ecr create-repository \
  --repository-name "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" >/dev/null

echo "Logging into ECR (${AWS_REGION})"
aws ecr get-login-password --region "${AWS_REGION}" | \
docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building Docker image from ${PROJECT_DIR}/job/Dockerfile"
docker build -t "${ECR_REPOSITORY}:${IMAGE_TAG}" -f "${PROJECT_DIR}/job/Dockerfile" "${PROJECT_DIR}/job"

echo "Tagging image: ${IMAGE_URI}"
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${IMAGE_URI}"

echo "Pushing image: ${IMAGE_URI}"
docker push "${IMAGE_URI}"

echo "Image pushed successfully."
echo "Set AWS_SAGEMAKER_IMAGE_URI=${IMAGE_URI}"
