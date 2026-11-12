import { describe, expect, it, vi } from 'vitest';
import { parseState, STORE_PREFIX } from '../lib/storage';
import { key, location, memory } from './fixtures';

describe('versioned local storage', () => {
  it('saves, reads and isolates conversations', async () => {
    const { repository } = memory();
    const state = await repository.execute({
      action: 'add',
      key,
      type: 'checkpoint',
      location,
    });
    expect(state.activeId).toBe(state.items[0]!.id);
    expect(
      (await repository.execute({ action: 'read', key })).items,
    ).toHaveLength(1);
    expect(
      (await repository.execute({ action: 'read', key: 'chatgpt:other' }))
        .items,
    ).toHaveLength(0);
  });
  it('serializes concurrent writes from different tabs without loss', async () => {
    const { repository } = memory();
    await Promise.all(
      Array.from({ length: 20 }, () =>
        repository.execute({ action: 'add', key, type: 'highlight', location }),
      ),
    );
    expect(
      (await repository.execute({ action: 'read', key })).items,
    ).toHaveLength(20);
  });
  it('supports keep, rename, replace and resume lifecycle', async () => {
    const { repository } = memory();
    const first = await repository.execute({
      action: 'add',
      key,
      type: 'checkpoint',
      location,
    });
    const id = first.activeId!;
    await repository.execute({ action: 'keep', key, id });
    await repository.execute({
      action: 'rename',
      key,
      id,
      label: '  Tree explanation  ',
    });
    await repository.execute({
      action: 'add',
      key,
      type: 'checkpoint',
      location,
    });
    const resumed = await repository.execute({ action: 'resume', key });
    expect(resumed.activeId).toBeUndefined();
    expect(resumed.items).toHaveLength(1);
    expect(resumed.items[0]!.label).toBe('Tree explanation');
    expect(resumed.items[0]!.kept).toBe(true);
  });
  it('deletes only the selected item and removes active id', async () => {
    const { repository } = memory();
    const saved = await repository.execute({
      action: 'add',
      key,
      type: 'checkpoint',
      location,
    });
    await repository.execute({
      action: 'add',
      key,
      type: 'highlight',
      location,
    });
    const next = await repository.execute({
      action: 'delete',
      key,
      id: saved.activeId!,
    });
    expect(next.activeId).toBeUndefined();
    expect(next.items.map((i) => i.type)).toEqual(['highlight']);
  });
  it.each([
    null,
    {},
    { schemaVersion: 2, items: [] },
    { schemaVersion: 1, items: [{}] },
    { schemaVersion: 1, items: [], activeId: 'ghost' },
  ])('preserves malformed or future data: %j', async (bad) => {
    const { repository, data } = memory();
    data.set(STORE_PREFIX + key, bad);
    await expect(
      repository.execute({ action: 'add', key, type: 'checkpoint', location }),
    ).rejects.toThrow('left untouched');
    expect(data.get(STORE_PREFIX + key)).toEqual(bad);
  });
  it('returns an empty v1 state for new users', () =>
    expect(parseState(undefined, key)).toEqual({
      schemaVersion: 1,
      items: [],
    }));
  it('does not acknowledge a failed storage write and permits retry', async () => {
    const { driver, repository } = memory();
    const original = driver.set;
    driver.set = vi
      .fn()
      .mockRejectedValueOnce(new Error('Storage quota exceeded'))
      .mockImplementation(original);
    await expect(
      repository.execute({ action: 'add', key, type: 'highlight', location }),
    ).rejects.toThrow('quota');
    expect(
      (await repository.execute({ action: 'read', key })).items,
    ).toHaveLength(0);
    expect(
      (
        await repository.execute({
          action: 'add',
          key,
          type: 'highlight',
          location,
        })
      ).items,
    ).toHaveLength(1);
  });
  it('enforces excerpt and capacity limits but still allows deletion', async () => {
    const { driver, repository } = memory();
    await expect(
      repository.execute({
        action: 'add',
        key,
        type: 'highlight',
        location: {
          ...location,
          anchor: { ...location.anchor, exact: 'a'.repeat(601) },
        },
      }),
    ).rejects.toThrow('could not be saved');
    const state = await repository.execute({
      action: 'add',
      key,
      type: 'highlight',
      location,
    });
    driver.bytes = async () => 9_000_000;
    await expect(
      repository.execute({ action: 'add', key, type: 'highlight', location }),
    ).rejects.toThrow('storage is full');
    expect(
      (
        await repository.execute({
          action: 'delete',
          key,
          id: state.items[0]!.id,
        })
      ).items,
    ).toHaveLength(0);
  });
  it('rejects cross-conversation anchor writes and invalid labels', async () => {
    const { repository } = memory();
    await expect(
      repository.execute({
        action: 'add',
        key: 'chatgpt:other',
        type: 'checkpoint',
        location,
      }),
    ).rejects.toThrow();
    const state = await repository.execute({
      action: 'add',
      key,
      type: 'checkpoint',
      location,
    });
    await expect(
      repository.execute({
        action: 'rename',
        key,
        id: state.activeId!,
        label: ' ',
      }),
    ).rejects.toThrow('1 and 80');
  });
});
