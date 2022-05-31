import { Address, BigInt, ByteArray, Bytes } from "@graphprotocol/graph-ts";
import { Jurisdiction as JurisdictionContract } from "../generated/templates/Jurisdiction/Jurisdiction";
import {
  AccountEntity,
  AvatarNftEntity,
  CaseEntity,
  CaseEventEntity,
  JurisdictionEntity,
  JurisdictionRuleEffectEntity,
  JurisdictionRuleEntity
} from "../generated/schema";
import {
  JURISDICTION_ROLE_ADMIN_ID,
  JURISDICTION_ROLE_JUDGE_ID,
  JURISDICTION_ROLE_MEMBER_ID
} from "./constants";

/**
 * Find or create account entity and add avatar nft entity to it.
 */
export function addAvatarNftToAccountEntity(
  account: Address,
  avatarNft: AvatarNftEntity
): void {
  let accountEntity = AccountEntity.load(account.toHexString());
  if (!accountEntity) {
    accountEntity = new AccountEntity(account.toHexString());
  }
  accountEntity.avatarNft = avatarNft.id;
  accountEntity.save();
}

/**
 * Find avatar nft entity and add jurisdiction entity to it.
 */
export function addJurisdictionToAvatarNftEntity(
  account: Address,
  jurisdiction: JurisdictionEntity
): void {
  let accountEntity = AccountEntity.load(account.toHexString());
  if (!accountEntity) {
    return;
  }
  let avatarNftEntity = AvatarNftEntity.load(accountEntity.avatarNft);
  if (!avatarNftEntity) {
    return;
  }
  let jurisdictions = avatarNftEntity.jurisdictions;
  jurisdictions.push(jurisdiction.id);
  avatarNftEntity.jurisdictions = jurisdictions;
  avatarNftEntity.save();
}

/**
 * Find avatar nft entity and remove jurisdiction entity from it.
 */
export function removeJurisdctionFromAvatarEntity(
  account: Address,
  jurisdiction: JurisdictionEntity
): void {
  let accountEntity = AccountEntity.load(account.toHexString());
  if (!accountEntity) {
    return;
  }
  let avatarNftEntity = AvatarNftEntity.load(accountEntity.avatarNft);
  if (!avatarNftEntity) {
    return;
  }
  let jurisdictions = avatarNftEntity.jurisdictions;
  const jurisdictionIndex = jurisdictions.indexOf(jurisdiction.id);
  if (jurisdictionIndex > -1) {
    jurisdictions.splice(jurisdictionIndex, 1);
  }
  avatarNftEntity.jurisdictions = jurisdictions;
  avatarNftEntity.save();
}

/**
 * Load jurisdiction by id or create new.
 */
export function getJurisdictionEntity(id: string): JurisdictionEntity {
  let jurisdictionEntity = JurisdictionEntity.load(id);
  if (!jurisdictionEntity) {
    // Load jurisdiction name from contract
    let jurisdictionContract = JurisdictionContract.bind(
      Address.fromString(id)
    );
    let jurisdictionContractName = jurisdictionContract.name();
    // Create jurisdiction enity
    jurisdictionEntity = new JurisdictionEntity(id);
    jurisdictionEntity.name = jurisdictionContractName;
    jurisdictionEntity.rulesCount = 0;
    jurisdictionEntity.casesCount = 0;
    jurisdictionEntity.memberAccounts = [];
    jurisdictionEntity.judgeAccounts = [];
    jurisdictionEntity.adminAccounts = [];
    jurisdictionEntity.memberAccountsCount = 0;
    jurisdictionEntity.save();
  }
  return jurisdictionEntity;
}

/**
 * Update jurisdiction role accounts.
 */
export function updateJurisdictionRoleAccounts(
  jurisdiction: JurisdictionEntity,
  role: string,
  accounts: Bytes[],
  accountsCount: i32,
): void {
  if (role == JURISDICTION_ROLE_MEMBER_ID) {
    jurisdiction.memberAccounts = accounts;
    jurisdiction.memberAccountsCount = accountsCount;
  }
  if (role == JURISDICTION_ROLE_JUDGE_ID) {
    jurisdiction.judgeAccounts = accounts;
  }
  if (role == JURISDICTION_ROLE_ADMIN_ID) {
    jurisdiction.adminAccounts = accounts;
  }
  jurisdiction.save();
}

/**
 * Update the positivity of jurisdiction rule after a extra rule effect is received.
 */
export function updateJurisdictionRuleEntityPositivity(
  rule: JurisdictionRuleEntity,
  extraRuleEffect: JurisdictionRuleEffectEntity
): void {
  let isRulePositive = true;
  // Prepare array with rule effect ids
  let ruleEffects = rule.effects;
  let fixedRuleEffects: Array<string> = ruleEffects
    ? ruleEffects
    : new Array<string>();
  // Check rule effects
  for (let i = 0; i < fixedRuleEffects.length; i++) {
    let ruleEffect = JurisdictionRuleEffectEntity.load(fixedRuleEffects[i]);
    if (!ruleEffect) {
      continue;
    }
    if (ruleEffect.name == extraRuleEffect.name) {
      continue;
    }
    if (!ruleEffect.direction) {
      isRulePositive = false;
    }
  }
  // Check new rule effect
  if (!extraRuleEffect.direction) {
    isRulePositive = false;
  }
  // Save result
  rule.isPositive = isRulePositive;
  rule.save();
}

/**
 * Create new case event entity.
 */
export function saveCaseEventEntity(
  caseEntity: CaseEntity,
  caseContractAddress: Address,
  eventTransactionHash: Bytes,
  eventBlockTimestamp: BigInt,
  eventType: string,
  eventDataJson: string
): void {
  let caseEventEntityId = `${caseContractAddress.toHexString()}_${eventTransactionHash.toHexString()}`;
  let caseEventEntity = new CaseEventEntity(caseEventEntityId);
  caseEventEntity.caseEntity = caseEntity.id;
  caseEventEntity.createdDate = eventBlockTimestamp;
  caseEventEntity.type = eventType;
  caseEventEntity.data = Bytes.fromByteArray(ByteArray.fromUTF8(eventDataJson));
  caseEventEntity.save();
}
