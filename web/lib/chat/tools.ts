export const chatTools = [
  {
    type: "function" as const,
    function: {
      name: "execute_payment",
      description: "Execute a policy-controlled USDC payment from the vault",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "string",
            description: "Amount of USDC to transfer",
          },
          address: {
            type: "string",
            description: "Recipient wallet address",
          },
        },
        required: ["amount", "address"],
      },
    },
  },
];
