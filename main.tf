terraform {
  required_version = ">= 1.7"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
  backend "gcs" {
    bucket = "rova-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ── VPC ──────────────────────────────────────────────────────
resource "google_compute_network" "rova_vpc" {
  name                    = "rova-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "rova_subnet" {
  name          = "rova-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.rova_vpc.id
}

resource "google_compute_global_address" "private_ip" {
  name          = "rova-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.rova_vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.rova_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]
}

# ── Cloud SQL PostgreSQL 16 ───────────────────────────────────
resource "google_sql_database_instance" "rova_postgres" {
  name             = "rova-postgres-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region
  deletion_protection = true

  settings {
    tier              = var.environment == "production" ? "db-custom-2-7680" : "db-f1-micro"
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true
    disk_size         = 20
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings { retained_backups = 7 }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.rova_vpc.id
    }

    insights_config {
      query_insights_enabled = true
      query_string_length    = 1024
    }
  }

  depends_on = [google_service_networking_connection.private_vpc]
}

resource "google_sql_database" "rova_db" {
  name     = "rova_db"
  instance = google_sql_database_instance.rova_postgres.name
}

resource "google_sql_user" "rova_user" {
  name     = var.db_user
  instance = google_sql_database_instance.rova_postgres.name
  password = var.db_password
}

# ── Memorystore Redis 7 ───────────────────────────────────────
resource "google_redis_instance" "rova_redis" {
  name               = "rova-redis"
  tier               = "BASIC"
  memory_size_gb     = 1
  region             = var.region
  redis_version      = "REDIS_7_0"
  authorized_network = google_compute_network.rova_vpc.id
}

# ── GCS — Model Artifacts ─────────────────────────────────────
resource "google_storage_bucket" "rova_artifacts" {
  name          = "rova-artifacts-${var.project_id}"
  location      = var.region
  force_destroy = false
  versioning { enabled = true }
}

# ── Secret Manager ────────────────────────────────────────────
resource "google_secret_manager_secret" "db_url" {
  secret_id = "rova-database-url"
  replication { auto {} }
}

resource "google_secret_manager_secret" "secret_key" {
  secret_id = "rova-secret-key"
  replication { auto {} }
}

# ── Cloud Run — API ───────────────────────────────────────────
resource "google_cloud_run_v2_service" "rova_api" {
  name     = "rova-api"
  location = var.region

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
    containers {
      image = "gcr.io/${var.project_id}/rova-api:${var.image_tag}"
      resources { limits = { cpu = "2", memory = "2Gi" } }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }
      env { name = "REDIS_URL";       value = "redis://${google_redis_instance.rova_redis.host}:6379/0" }
      env { name = "ENVIRONMENT";     value = var.environment }
      env { name = "GCP_PROJECT_ID";  value = var.project_id }
      env { name = "GCS_BUCKET";      value = google_storage_bucket.rova_artifacts.name }

      liveness_probe {
        http_get { path = "/health" }
        initial_delay_seconds = 15
        period_seconds        = 30
      }
    }
    vpc_access {
      network_interfaces {
        network    = google_compute_network.rova_vpc.id
        subnetwork = google_compute_subnetwork.rova_subnet.id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.rova_api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Cloud Run — Frontend ──────────────────────────────────────
resource "google_cloud_run_v2_service" "rova_frontend" {
  name     = "rova-frontend"
  location = var.region
  template {
    containers {
      image = "gcr.io/${var.project_id}/rova-frontend:${var.image_tag}"
      resources { limits = { cpu = "1", memory = "512Mi" } }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.rova_frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Managed SSL ───────────────────────────────────────────────
resource "google_compute_managed_ssl_certificate" "rova_cert" {
  name = "rova-ssl-cert"
  managed { domains = ["rova.ai", "api.rova.ai"] }
}
