Cloud Storage Setup
===================

- Create bucket called "vynos-staging.spankdev.com"
- Add the "Storage -> Storage Object View" permission to "allUsers"
  (cloudbuild automatically has write access)

- Rename _FRAME_URL to _FRAME_DOMAIN in build trigger and strip the https://
  prefix (will be added by cloudbuild.yaml)

- Add the appropriate lines to cloudbuild.yaml::

  - name: 'gcr.io/$PROJECT_ID/$REPO_NAME/${_PROJECT}/${_ENV}:$COMMIT_SHA'
    args: [ 'cp', '-r', '/usr/share/nginx/html/', 'dist']
    dir: '${_PROJECT}'

  - name: 'gcr.io/cloud-builders/gsutil'
    args: ["-m", "rsync", "-r", "-c", "-d", "./dist/", "gs://${_FRAME_DOMAIN}"]
    dir: '${_PROJECT}'

- Setup CloudFlare to cname vynos-staging.spankdev.com -> c.storage.googleapis.com
