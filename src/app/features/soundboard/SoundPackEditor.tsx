import React, { FormEventHandler, useRef, useState } from 'react';
import { Box, Button, config, Icon, IconButton, Icons, Input, Spinner, Text, color } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCardStyle } from '../settings/styles.css';
import {
  readSoundFile,
  newSoundId,
  Sound,
  SoundPack,
  SoundPackContent,
  withoutSound,
  withSound,
  MAX_SOUND_BYTES,
  MAX_SOUND_MS,
} from '../../plugins/sound-pack';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { EmojiPickerButton } from './EmojiPickerButton';
import { useSoundBlobUrl } from './useSoundPlayer';

const formatDuration = (ms?: number) => (ms === undefined ? '' : `${(ms / 1000).toFixed(1)} s`);

type SoundRowProps = {
  sound: Sound;
  canEdit: boolean;
  onSave: (id: string, name: string, emoji: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
};
function SoundRow({ sound, canEdit, onSave, onDelete }: SoundRowProps) {
  const getBlobUrl = useSoundBlobUrl();
  const [editing, setEditing] = useState(false);
  const [emoji, setEmoji] = useState(sound.emoji);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement>();

  const preview = async () => {
    audioRef.current?.pause();
    const audio = new Audio(await getBlobUrl(sound.url));
    audioRef.current = audio;
    audio.play().catch(() => undefined);
  };

  const handleSave: FormEventHandler<HTMLFormElement> = async (evt) => {
    evt.preventDefault();
    const form = evt.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    if (!name) return;
    setBusy(true);
    await onSave(sound.id, name, emoji ?? '').catch(() => undefined);
    setBusy(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    setBusy(true);
    await onDelete(sound.id).catch(() => undefined);
    setBusy(false);
  };

  if (editing) {
    return (
      <SettingTile>
        <Box as="form" onSubmit={handleSave} gap="200" alignItems="End">
          <Box direction="Column" gap="100">
            <Text size="L400">Emoji</Text>
            <EmojiPickerButton value={emoji} onChange={setEmoji} />
          </Box>
          <Box direction="Column" gap="100" grow="Yes">
            <Text size="L400">Name</Text>
            <Input
              name="name"
              size="400"
              variant="Secondary"
              radii="300"
              defaultValue={sound.name}
              required
            />
          </Box>
          <Button type="submit" size="400" variant="Primary" radii="300" disabled={busy}>
            <Text size="B400">Save</Text>
          </Button>
          <Button
            type="button"
            size="400"
            variant="Secondary"
            fill="Soft"
            radii="300"
            onClick={() => {
              setEmoji(sound.emoji);
              setEditing(false);
            }}
          >
            <Text size="B400">Cancel</Text>
          </Button>
        </Box>
      </SettingTile>
    );
  }

  return (
    <SettingTile
      title={`${sound.emoji ? `${sound.emoji} ` : ''}${sound.name}`}
      description={formatDuration(sound.duration)}
      after={
        <Box gap="100" alignItems="Center">
          <IconButton
            size="300"
            variant="Secondary"
            fill="None"
            radii="300"
            aria-label="Preview"
            onClick={() => preview().catch(() => undefined)}
          >
            <Icon size="100" src={Icons.Play} />
          </IconButton>
          {canEdit && (
            <>
              <IconButton
                size="300"
                variant="Secondary"
                fill="None"
                radii="300"
                aria-label="Rename"
                onClick={() => setEditing(true)}
              >
                <Icon size="100" src={Icons.Pencil} />
              </IconButton>
              <IconButton
                size="300"
                variant="Critical"
                fill="None"
                radii="300"
                aria-label="Delete"
                disabled={busy}
                onClick={handleDelete}
              >
                <Icon size="100" src={Icons.Delete} />
              </IconButton>
            </>
          )}
        </Box>
      }
    />
  );
}

type SoundPackEditorProps = {
  pack: SoundPack;
  canEdit: boolean;
  /** Replaces the pack's stored content. */
  onUpdate: (content: SoundPackContent) => Promise<unknown>;
};
/** Lists a sound pack and, if editable, uploads, renames and deletes its sounds. */
export function SoundPackEditor({ pack, canEdit, onUpdate }: SoundPackEditorProps) {
  const mx = useMatrixClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [newEmoji, setNewEmoji] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const handleUpload: FormEventHandler<HTMLFormElement> = async (evt) => {
    evt.preventDefault();
    const form = evt.currentTarget;
    if (!file || uploading) return;
    const name =
      (form.elements.namedItem('name') as HTMLInputElement).value.trim() ||
      file.name.replace(/\.[^.]+$/, '');

    setUploading(true);
    setError(undefined);
    try {
      const { duration } = await readSoundFile(file);
      const { content_uri: url } = await mx.uploadContent(file, {
        name: file.name,
        type: file.type,
      });
      const id = newSoundId(name, (taken) => !!pack.content.sounds?.[taken]);
      await onUpdate(
        withSound(pack.content, id, {
          url,
          name,
          emoji: newEmoji,
          info: { mimetype: file.type, size: file.size, duration },
        })
      );
      form.reset();
      setFile(undefined);
      setNewEmoji(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = (id: string, name: string, emoji: string) => {
    const existing = pack.content.sounds?.[id];
    if (!existing) return Promise.resolve();
    return onUpdate(withSound(pack.content, id, { ...existing, name, emoji: emoji || undefined }));
  };

  return (
    <Box direction="Column" gap="100">
      {pack.sounds.length === 0 && (
        <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
          <SettingTile title="No sounds yet" description="Upload a short clip below." />
        </SequenceCard>
      )}
      {pack.sounds.map((sound) => (
        <SequenceCard
          key={sound.key}
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
        >
          <SoundRow
            sound={sound}
            canEdit={canEdit}
            onSave={handleSave}
            onDelete={(id) => onUpdate(withoutSound(pack.content, id))}
          />
        </SequenceCard>
      ))}
      {canEdit && (
        <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
          <SettingTile
            title="Add Sound"
            description={`An audio clip up to ${MAX_SOUND_MS / 1000} seconds and ${
              MAX_SOUND_BYTES / 1024 / 1024
            } MB.`}
          >
            <Box
              as="form"
              onSubmit={handleUpload}
              gap="200"
              alignItems="End"
              style={{ marginTop: config.space.S200 }}
            >
              <Box direction="Column" gap="100">
                <Text size="L400">Emoji</Text>
                <EmojiPickerButton value={newEmoji} onChange={setNewEmoji} />
              </Box>
              <Box direction="Column" gap="100" grow="Yes">
                <Text size="L400">Name</Text>
                <Input
                  name="name"
                  size="400"
                  variant="Secondary"
                  radii="300"
                  placeholder={file ? file.name.replace(/\.[^.]+$/, '') : undefined}
                />
              </Box>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(evt) => setFile(evt.currentTarget.files?.[0])}
              />
              <Button
                type="button"
                size="400"
                variant="Secondary"
                fill="Soft"
                radii="300"
                outlined
                onClick={() => fileRef.current?.click()}
                style={{ maxWidth: 160 }}
              >
                <Text size="B400" truncate>
                  {file ? file.name : 'Choose File'}
                </Text>
              </Button>
              <Button
                type="submit"
                size="400"
                variant="Primary"
                radii="300"
                disabled={!file || uploading}
                before={
                  uploading ? <Spinner size="100" variant="Primary" fill="Solid" /> : undefined
                }
              >
                <Text size="B400">Add</Text>
              </Button>
            </Box>
            {error && (
              <Text
                size="T200"
                style={{ color: color.Critical.Main, marginTop: config.space.S100 }}
              >
                {error}
              </Text>
            )}
          </SettingTile>
        </SequenceCard>
      )}
    </Box>
  );
}
