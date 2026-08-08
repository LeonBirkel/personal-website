# ops

The operational side of the reference instance (leonbirkel.com): the scripts
that run on its server, the systemd units that schedule them, and the
prepared Wikidata batches. Consumers deploying their own instance do not need
anything in here, the deploy kit under [deploy/](../deploy/) is
self-contained. These files stay public as a worked example of running an
instance seriously.

These files used to live only on the server, which meant no version history,
no review, and one copy on one machine. They are the source of truth now.
Edit here, then install.

In the commands below, `<server>` is the reference instance's admin address.
It lives in the private ops notes, not in this repository.

## Layout

```
bin/                  scripts installed to /usr/local/sbin, mode 0700, root only
  site-backup         nightly database dump + uploads tarball, verified before it counts
  site-restore        restore a dump and its uploads, transactional, with a safety snapshot
  site-deploy         pull and roll the newest image now, instead of waiting for Watchtower
  site-rollback       pin a specific published release
systemd/              units installed to /etc/systemd/system
  personal-website.service          brings the stack up after a reboot
  personal-website-backup.service   oneshot wrapper around site-backup
  personal-website-backup.timer     daily at 02:30 UTC
install.sh            installs all of the above, idempotently, with backups
wikidata-*.txt        the real QuickStatements batches that created the reference
                      instance's Wikidata items, kept as a worked example for the
                      off-site entity playbook in CLAUDE.md
private/              gitignored. Server-specific notes and values, never published
```

## Installing

From a checkout, over the admin VPN:

```bash
scp -r ops root@<server>:/tmp/
ssh root@<server> 'bash /tmp/ops/install.sh'
```

Existing files are backed up beside themselves before being replaced, so a bad change to these
scripts is always recoverable.

## Day to day

```bash
ssh root@<server> site-deploy            # roll the newest image now
ssh root@<server> site-rollback v1.0.0   # pin a known-good release
ssh root@<server> site-backup            # take a backup outside the schedule
ssh root@<server> site-restore           # restore the newest backup
```

`site-rollback` pins an image but does not undo migrations. If the bad release changed the
schema, restore the database first. Watchtower returns to the published `:latest` at 03:00 UTC,
so publish a fixed release before then.

## Things worth knowing before you edit these

- `site-restore` **wipes the uploads volume** before extracting the tarball that sits beside the
  dump. If no tarball is found it warns and leaves the volume alone. Take an independent
  snapshot before running a drill, as the drill notes in `private/` describe.
- `site-restore` deliberately leaves the app **stopped** if the restore fails. The database is
  then in an unknown state, and starting the app would run `prisma migrate deploy` against it.
- `site-backup` verifies a dump before promoting it: it must list with `pg_restore` and contain
  at least five tables. A failed verification leaves the previous backups untouched rather than
  rotating a broken one into place.
- Backups are local only, on the same disk as the data. That is a deliberate decision, recorded
  in TODO.md. It covers a bad migration, not the loss of the machine.
