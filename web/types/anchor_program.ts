/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `web/lib/solana/anchor-program-idl.json`.
 */
export type AnchorProgram = {
  "address": "2AQb8x4MEFmLKtF3QhoFtNvDD7sXFNqaC6rQuuE6CnGi",
  "metadata": {
    "name": "anchorProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "executePayment",
      "discriminator": [
        86,
        4,
        7,
        7,
        120,
        139,
        232,
        139
      ],
      "accounts": [
        {
          "name": "agent",
          "signer": true,
          "relations": [
            "vaultState"
          ]
        },
        {
          "name": "vaultState",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultState"
              }
            ]
          }
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "agent"
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "vaultState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "dailyLimit",
          "type": "u64"
        },
        {
          "name": "hourlyLimit",
          "type": "u64"
        },
        {
          "name": "onetimeLimit",
          "type": "u64"
        }
      ]
    },
    {
      "name": "ownerForceTransfer",
      "discriminator": [
        88,
        74,
        91,
        215,
        186,
        178,
        107,
        0
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vaultState"
          ]
        },
        {
          "name": "vaultState",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultState"
              }
            ]
          }
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "dailyLimitExceeded",
      "msg": "The requested amount exceeds the daily limit."
    },
    {
      "code": 6001,
      "name": "hourlyLimitExceeded",
      "msg": "The requested amount exceeds the hourly payment limit."
    },
    {
      "code": 6002,
      "name": "onetimeLimitExceeded",
      "msg": "The requested amount exceeds the single payment limit."
    },
    {
      "code": 6003,
      "name": "mathOverflow",
      "msg": "A mathematical overflow occurred during calculation."
    },
    {
      "code": 6004,
      "name": "invalidLimitsConfiguration",
      "msg": "Daily limit must be greater than or equal to the one-time limit."
    }
  ],
  "types": [
    {
      "name": "vault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "dailyLimit",
            "type": "u64"
          },
          {
            "name": "hourlyLimit",
            "type": "u64"
          },
          {
            "name": "onetimeLimit",
            "type": "u64"
          },
          {
            "name": "spentToday",
            "type": "u64"
          },
          {
            "name": "spentHour",
            "type": "u64"
          },
          {
            "name": "lastResetTime",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
