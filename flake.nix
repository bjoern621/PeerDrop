{
  description = "PeerDrop development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          dotnet = pkgs.dotnetCorePackages.sdk_9_0;
        in
        {
          default = pkgs.mkShell {
            packages = [
              dotnet
              pkgs.nodejs_22
              pkgs.go-task
            ];

            # Required by IDEs and tools that locate the SDK via DOTNET_ROOT.
            DOTNET_ROOT = "${dotnet}/share/dotnet";

            # Playwright's own browser downloads miss the libraries on NixOS.
            # @playwright/test in frontend/package.json matches the version of this driver.
            PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
          };
        }
      );
    };
}
