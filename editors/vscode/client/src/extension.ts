// ZZ Language Extension Client
// Activates and manages the language server

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // Path to the server module
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  // Server options - run the server as a Node process
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    // Register the server for ZZ files
    documentSelector: [{ scheme: 'file', language: 'zz' }],
    synchronize: {
      // Watch for .zz file changes
      fileEvents: workspace.createFileSystemWatcher('**/*.zz'),
    },
  };

  // Create and start the client
  client = new LanguageClient(
    'zzLanguageServer',
    'ZZ Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client (also launches the server)
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
