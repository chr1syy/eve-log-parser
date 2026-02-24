import { render, screen } from "@testing-library/react";
import FleetEnemiesTable from "@/components/fleet/FleetEnemiesTable";
import type { EnemyStats } from "@/types/fleet";

describe("FleetEnemiesTable", () => {
  const mockEnemies: EnemyStats[] = [
    {
      name: "Enemy Alpha",
      corp: "Corp A",
      damageDealt: 1500000000, // 1.5B
      damageReceived: 800000000,
      kills: 2,
    },
    {
      name: "Enemy Beta",
      corp: "Corp B",
      damageDealt: 1200000000, // 1.2B
      damageReceived: 700000000,
      kills: 1,
    },
    {
      name: "Enemy Gamma",
      corp: "Corp C",
      damageDealt: 1000000000, // 1.0B
      damageReceived: 600000000,
      kills: 0,
    },
    {
      name: "Enemy Delta",
      corp: "Corp D",
      damageDealt: 800000000, // 800M
      damageReceived: 500000000,
      kills: 3,
    },
    {
      name: "Enemy Epsilon",
      corp: "Corp E",
      damageDealt: 500000000, // 500M
      damageReceived: 400000000,
      kills: 0,
    },
  ];

  it("displays all 5 enemies in the table", () => {
    render(<FleetEnemiesTable enemies={mockEnemies} />);

    expect(screen.getByText("Enemy Alpha")).toBeInTheDocument();
    expect(screen.getByText("Enemy Beta")).toBeInTheDocument();
    expect(screen.getByText("Enemy Gamma")).toBeInTheDocument();
    expect(screen.getByText("Enemy Delta")).toBeInTheDocument();
    expect(screen.getByText("Enemy Epsilon")).toBeInTheDocument();
  });

  it("displays correct corp values", () => {
    render(<FleetEnemiesTable enemies={mockEnemies} />);

    expect(screen.getByText("Corp A")).toBeInTheDocument();
    expect(screen.getByText("Corp B")).toBeInTheDocument();
    expect(screen.getByText("Corp C")).toBeInTheDocument();
    expect(screen.getByText("Corp D")).toBeInTheDocument();
    expect(screen.getByText("Corp E")).toBeInTheDocument();
  });

  it("displays correct kills and formatted damage values", () => {
    render(<FleetEnemiesTable enemies={mockEnemies} />);

    expect(screen.getByText("2")).toBeInTheDocument(); // Alpha kills
    expect(screen.getByText("1")).toBeInTheDocument(); // Beta kills
    expect(screen.getByText("0")).toBeInTheDocument(); // Gamma and Epsilon kills (appears twice)
    expect(screen.getByText("3")).toBeInTheDocument(); // Delta kills

    expect(screen.getByText("1.5B")).toBeInTheDocument(); // Alpha damage
    expect(screen.getByText("1.2B")).toBeInTheDocument(); // Beta damage
    expect(screen.getByText("1.0B")).toBeInTheDocument(); // Gamma damage
    expect(screen.getByText("800M")).toBeInTheDocument(); // Delta damage
    expect(screen.getByText("500M")).toBeInTheDocument(); // Epsilon damage
  });

  it("sorts by damage dealt descending by default", () => {
    render(<FleetEnemiesTable enemies={mockEnemies} />);

    // Default sort is damageDealt descending, so Alpha (1.5B) first, Beta (1.2B), Gamma (1.0B), Delta (800M), Epsilon (500M)
    const rows = screen.getAllByRole("row");
    // Skip header row, check first data row
    const firstRowCells = rows[1].querySelectorAll("td");
    expect(firstRowCells[0]).toHaveTextContent("Enemy Alpha");

    const secondRowCells = rows[2].querySelectorAll("td");
    expect(secondRowCells[0]).toHaveTextContent("Enemy Beta");

    const thirdRowCells = rows[3].querySelectorAll("td");
    expect(thirdRowCells[0]).toHaveTextContent("Enemy Gamma");

    const fourthRowCells = rows[4].querySelectorAll("td");
    expect(fourthRowCells[0]).toHaveTextContent("Enemy Delta");

    const fifthRowCells = rows[5].querySelectorAll("td");
    expect(fifthRowCells[0]).toHaveTextContent("Enemy Epsilon");
  });

  it("displays status with correct colors", () => {
    render(<FleetEnemiesTable enemies={mockEnemies} />);

    // Killed status for enemies with kills > 0 (Alpha, Beta, Delta) - red
    const killedElements = screen.getAllByText("Killed");
    expect(killedElements).toHaveLength(3);

    // Survived status for enemies with kills == 0 (Gamma, Epsilon) - green
    const survivedElements = screen.getAllByText("Survived");
    expect(survivedElements).toHaveLength(2);

    // Check classes
    const statusCells = screen.getAllByText(/^Killed|Survived$/);

    const killedCells = statusCells.filter(
      (cell) => cell.textContent === "Killed",
    );
    killedCells.forEach((cell) => {
      expect(cell).toHaveClass("bg-red-900/20", "text-red-400");
    });

    const survivedCells = statusCells.filter(
      (cell) => cell.textContent === "Survived",
    );
    survivedCells.forEach((cell) => {
      expect(cell).toHaveClass("bg-green-900/20", "text-green-400");
    });
  });

  it("shows tooltips with raw damage numbers on hover", () => {
    render(<FleetEnemiesTable enemies={mockEnemies} />);

    // Damage dealt spans with titles
    const damageSpans = screen.getAllByTitle(/\(raw: \d+\)/);

    // One per enemy: 5
    expect(damageSpans).toHaveLength(5);

    // Check specific ones
    const alphaDamage = screen.getByTitle("(raw: 1500000000)");
    expect(alphaDamage).toHaveTextContent("1.5B");

    const epsilonDamage = screen.getByTitle("(raw: 500000000)");
    expect(epsilonDamage).toHaveTextContent("500M");
  });
});
