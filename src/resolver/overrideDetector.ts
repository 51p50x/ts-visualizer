import { MemberInfo } from '../model/types';

/**
 * Result of override detection for a single member.
 */
export interface OverrideInfo {
  /** The member name that is overridden */
  memberName: string;
  /** The type that declares the override (child) */
  overriddenBy: string;
  /** The type whose member is being overridden (ancestor) */
  originalOwner: string;
  /** The inheritance level of the original declaration */
  originalLevel: number;
}

/**
 * Given a flat list of all members collected from the hierarchy
 * (own + inherited), detect which members are overrides.
 *
 * An override occurs when a descendant declares a member with the
 * same name and kind as an ancestor's member.
 *
 * Returns a map: memberName → OverrideInfo[]
 * (a member can be overridden at multiple levels in deep chains)
 */
export function detectOverrides(
  allMembers: MemberInfo[]
): Map<string, OverrideInfo[]> {
  const overrideMap = new Map<string, OverrideInfo[]>();

  // Group members by name + kind (constructors are unique per class)
  const membersByKey = new Map<string, MemberInfo[]>();
  for (const member of allMembers) {
    if (member.kind === 'constructor') {
      continue; // Constructors don't override each other
    }
    const key = `${member.name}:${member.kind}`;
    const group = membersByKey.get(key) ?? [];
    group.push(member);
    membersByKey.set(key, group);
  }

  // For each group with multiple entries, the one at the lowest level
  // (closest to root = 0) overrides the others
  for (const [_key, group] of membersByKey) {
    if (group.length <= 1) {
      continue;
    }

    // Sort by inheritanceLevel ascending (0 = own, 1 = parent, etc.)
    group.sort((a, b) => a.inheritanceLevel - b.inheritanceLevel);

    // The first entry (lowest level) is the effective member.
    // All subsequent entries with higher levels are being overridden.
    const effectiveMember = group[0];
    const effectiveOwner =
      effectiveMember.inheritedFrom ??
      effectiveMember.inheritancePath[0];

    for (let i = 1; i < group.length; i++) {
      const overriddenMember = group[i];
      const originalOwner =
        overriddenMember.inheritedFrom ??
        overriddenMember.inheritancePath[0];

      const overrides = overrideMap.get(effectiveMember.name) ?? [];
      overrides.push({
        memberName: effectiveMember.name,
        overriddenBy: effectiveOwner,
        originalOwner,
        originalLevel: overriddenMember.inheritanceLevel,
      });
      overrideMap.set(effectiveMember.name, overrides);
    }
  }

  return overrideMap;
}

/**
 * Apply override information to the member list.
 *
 * - Members at the lowest level get `isOverride: true` and `overrides: <type>`
 * - Duplicate inherited members that have been overridden are removed
 *   from the effective list.
 *
 * Returns the deduplicated, override-annotated member list.
 */
export function applyOverrides(allMembers: MemberInfo[]): MemberInfo[] {
  const overrideMap = detectOverrides(allMembers);
  const effectiveMembers: MemberInfo[] = [];
  const seenKeys = new Set<string>();

  // Sort: own members first (level 0), then by level ascending
  const sorted = [...allMembers].sort(
    (a, b) => a.inheritanceLevel - b.inheritanceLevel
  );

  for (const member of sorted) {
    if (member.kind === 'constructor') {
      // Always include constructors (they don't override)
      effectiveMembers.push(member);
      continue;
    }

    const key = `${member.name}:${member.kind}`;

    if (seenKeys.has(key)) {
      // This is a higher-level duplicate — already overridden, skip it
      continue;
    }

    seenKeys.add(key);

    // Check if this member overrides an ancestor's member
    const overrides = overrideMap.get(member.name);
    if (overrides && overrides.length > 0) {
      effectiveMembers.push({
        ...member,
        isOverride: true,
        overrides: overrides[0].originalOwner,
      });
    } else {
      effectiveMembers.push(member);
    }
  }

  return effectiveMembers;
}
