export const chatTools = [
  {
    type: "function" as const,
    function: {
      name: "transfer",
      description: "Transfer USDC to a recipient",
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
