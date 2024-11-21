# ./terraform/outputs.tf
output "kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.game_state.id
  description = "KV namespace ID"
}

output "r2_bucket_name" {
  value       = cloudflare_r2_bucket.game_assets.name
  description = "R2 bucket name"
}

output "worker_script_name" {
  value       = cloudflare_workers_script.game_api.name
  description = "Worker script name"
}