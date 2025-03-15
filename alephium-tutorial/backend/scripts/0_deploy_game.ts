import { Deployer, DeployFunction, Network } from "@alephium/cli";
import { Settings } from "../alephium.config";  
import { Game } from "../artifacts/ts";  
import { testNodeWallet } from "@alephium/web3-test";
import { NodeProvider, ONE_ALPH, web3, Contract, stringToHex } from "@alephium/web3";

interface GameInstance {
  subscribeDebugEvent: (options: {
    pollingInterval: number;
    messageCallback: (event: any) => void;
    errorCallback: (error: any) => void;
  }) => void;
}

const deployContract: DeployFunction<Settings> = async (
  deployer: Deployer,
  network: Network<Settings>
): Promise<void> => {
  web3.setCurrentNodeProvider(new NodeProvider(network.nodeUrl));

  // Préparation du wallet pour signer les transactions
  const signer = await testNodeWallet();
  const accounts = await signer.getAccounts();
  const account = accounts[0];
  console.log("     ");
  console.log("Adresse que je dois financer en Alph via le faucet: ");
  console.log(account.address);
  console.log("     ");

  // Déploiement du contrat Game avec 100 ALPH initiaux
  const initialFunds = ONE_ALPH * 100n; // 100 ALPH en attoALPH
  const result = await deployer.deployContract(Game, {
    initialFields: {},
    initialAttoAlphAmount: initialFunds // Envoie 100 ALPH au contrat depuis le wallet
  });

  console.log("     ");
  console.log("Contract ID Game: " + result.contractInstance.contractId);
  console.log("Adresse du smart contract du jeu: " + result.contractInstance.address);
  console.log("     ");

  // Affichage de l'adresse du wallet qui va jouer
  console.log("     ");
  console.log("Adresse du wallet qui joue: ", account.address);
  console.log("     ");

  const playerBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(account.address);
  //console.log("Raw player balance: ", playerBalance);
  
  // Convertir en ALPH (atteindre une valeur plus lisible)
  const playerBalanceInAlph = Number(playerBalance.balance) / Number(ONE_ALPH);
  console.log("💰 Player balance before bet: ", playerBalanceInAlph, "ALPH");
  
  const contractAddress = result.contractInstance.address;
      const transferAmount = ONE_ALPH * 100n; 
      await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(contractAddress);
      console.log(`Je transfert  ${transferAmount / ONE_ALPH} ALPH sur le contrat ${contractAddress} `);


  // Interaction avec le contrat
  const InstanceContract = result.contractInstance;
  console.log("RESULTAT DE CONTRACT INSTANCE", InstanceContract);

  const contractBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(InstanceContract.address);
  console.log("Solde brut du contrat avant appel:", Number(contractBalance.balance) / Number(ONE_ALPH), "ALPH");
  
  // Appel via transact pour générer une transaction
  try {
    const txResult = await InstanceContract.transact.retrieveGameBalance({
      signer: signer, 
      attoAlphAmount: 0n 
    });
    const balanceInAtto = txResult;  // Récupère la valeur retournée (U256)
    console.log("balanceInAtto", balanceInAtto)
    const balanceInALPH = Number(balanceInAtto) / Number(ONE_ALPH); // Convertit en ALPH
    console.log("Solde retourné:", balanceInALPH, "ALPH");
  } catch (error) {
    console.error("Erreur lors de l'appel à retrieveGameBalance:", error);
  }
  

  // Jouer une partie (Rock = 0, mise de 1 ALPH)
  const betAmount = ONE_ALPH * 1n; // 1 ALPH en attoALPH


  let lastProcessedEventIndex = -1;  // Garde trace de l'index du dernier événement traité


  InstanceContract.subscribeGamePlayedEvent({
    pollingInterval: 1000,
    messageCallback: (event: any) => {
      if (event.eventIndex > lastProcessedEventIndex) {  // Si l'événement est nouveau
        console.log('Game Played Event:', event);
        const { player, playerChoice, contractChoice, betAmount, won } = event.fields;
        console.log(`${player} chose ${playerChoice}, contract chose ${contractChoice}. Result: ${won ? 'You won!' : 'You lost!'}`);
        lastProcessedEventIndex = event.eventIndex;  // Met à jour l'index du dernier événement traité
      }
    },
    errorCallback: (error: any) => {
      console.error('Error while listening to GamePlayed event:', error);
    }
  });
  

/*
  //AVEC HISTORIQUE DES PARTIES
  InstanceContract.subscribeGamePlayedEvent({
    pollingInterval: 1000,
    messageCallback: (event: any) => {
      // Extraction des données
      const { player, playerChoice, contractChoice, betAmount, won } = event.fields;
  
      // Affichage des choix et du résultat
      console.log(`Player (${player}) chose ${playerChoice === 0n ? 'Rock' : playerChoice === 1n ? 'Paper' : 'Scissors'}`);
      console.log(`Contract chose ${contractChoice === 0n ? 'Rock' : contractChoice === 1n ? 'Paper' : 'Scissors'}`);
      console.log(`Bet: ${Number(betAmount) / Number(ONE_ALPH)} ALPH`);
      console.log(`Result: ${won ? 'You won!' : 'You lost!'}`);
    },
    errorCallback: (error: any) => {
      console.error('Error while listening to GamePlayed event:', error);
    }
  });
*/

  await InstanceContract.transact.play({
    signer,
    args: { playerChoice: 0n, betAmount },
    attoAlphAmount: betAmount,
  });
  console.log("Played game with choice Rock and bet of 1 ALPH");
    


};

export default deployContract;