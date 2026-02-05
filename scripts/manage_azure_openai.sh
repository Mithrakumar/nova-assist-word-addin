#!/bin/bash
set -e

# Function to check if az is installed
check_az() {
    if ! command -v az &> /dev/null; then
        echo "Azure CLI could not be found. Please install it with 'brew install azure-cli' and run 'az login'."
        exit 1
    fi
}

# Function to list models
list_models() {
    RESOURCE_GROUP=$1
    ACCOUNT_NAME=$2

    echo "Listing models for account: $ACCOUNT_NAME in resource group: $RESOURCE_GROUP..."
    az cognitiveservices account list-models \
        --resource-group "$RESOURCE_GROUP" \
        --name "$ACCOUNT_NAME" \
        --query "[].{Name:name, Version:version, Format:format}" \
        --output table
}

# Function to deploy a model
deploy_model() {
    RESOURCE_GROUP=$1
    ACCOUNT_NAME=$2
    MODEL_NAME=$3
    DEPLOYMENT_NAME=$4

    echo "Deploying model $MODEL_NAME as $DEPLOYMENT_NAME..."
    az cognitiveservices account deployment create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$ACCOUNT_NAME" \
        --deployment-name "$DEPLOYMENT_NAME" \
        --model-name "$MODEL_NAME" \
        --model-version "current" \
        --model-format OpenAI \
        --sku-name "Standard" \
        --sku-capacity 1
    
    echo "Deployment $DEPLOYMENT_NAME created successfully."
}

# Main execution
check_az

echo "1. List OpenAI Accounts"
az cognitiveservices account list --kind OpenAI --query "[].{Name:name, ResourceGroup:resourceGroup, Location:location}" -o table

echo ""
echo "Enter the Resource Group Name from above:"
read rg_name
echo "Enter the Account Name from above:"
read acc_name

list_models "$rg_name" "$acc_name"

echo ""
echo "Enter the Model Name to deploy (e.g., gpt-4):"
read model_to_deploy
echo "Enter a name for this deployment (e.g., gpt-4-prod):"
read dep_name

deploy_model "$rg_name" "$acc_name" "$model_to_deploy" "$dep_name"
