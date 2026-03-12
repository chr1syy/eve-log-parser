export interface ZKillEntry {
  killmail_id: number;
  killmail_hash: string;
  zkb: { points: number; totalValue: number; locationID?: number };
}

export interface ESIKillmail {
  killmail_id: number;
  killmail_time: string; // ISO datetime
  solar_system_id: number;
  victim: {
    character_id?: number;
    corporation_id?: number;
    ship_type_id: number;
    damage_taken: number;
  };
  attackers: {
    character_id?: number;
    corporation_id?: number;
    ship_type_id: number;
    weapon_type_id: number;
    damage_done: number;
    final_blow: boolean;
  }[];
}

export interface ResolvedKillmail {
  killmailId: number;
  killmailHash: string;
  killmailTime: Date;
  victim: ESIKillmail["victim"];
  attackers: ESIKillmail["attackers"];
  zkbPoints: number;
  zkbValue: number;
  zkillUrl: string; // e.g. "https://zkillboard.com/kill/{id}/"
}
