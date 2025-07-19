<script module lang="ts">
	export type Security = (typeof securities)[number];
</script>

<script lang="ts">
	import securities from '$lib/securities/aggregated.json';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Pagination from '$lib/components/ui/pagination';
	import { Badge } from '$lib/components/ui/badge';
	import DataTableActions from '$lib/components/data-table-actions.svelte';

	import { createTable, createRender, Render, Subscribe } from 'svelte-headless-table';
	import {
		addPagination,
		addSortBy,
		addTableFilter,
		addHiddenColumns
	} from 'svelte-headless-table/plugins';
	import { writable } from 'svelte/store';
	import { ArrowUpDown, ChevronDown } from 'lucide-svelte';

	const percentFormatter = new Intl.NumberFormat(undefined, {
		style: 'percent',
		maximumFractionDigits: 2
	});

	const currencyFormatter = new Intl.NumberFormat(undefined, {
		style: 'currency',
		notation: 'compact',
		currency: 'CAD',
		currencyDisplay: 'narrowSymbol'
	});

	const numberFormatter = new Intl.NumberFormat(undefined, {
		style: 'decimal',
		maximumFractionDigits: 2
	});

	const securitiesStore = writable(securities);

	const table = createTable(securitiesStore, {
		page: addPagination(),
		sort: addSortBy({
			initialSortKeys: []
		}),
		filter: addTableFilter({
			fn: ({ filterValue, value }) => value.toLowerCase().includes(filterValue.toLowerCase())
		}),
		hide: addHiddenColumns()
	});

	let h: (s: Security) => number = $state(() => 0);

	let hString = $state('');

	function onHeuristicChange() {
		try {
			const fn = eval(`(s) => ${hString}`);

			if (typeof fn === 'function') {
				h = fn;
				securitiesStore.update((securities) => securities);
			}
		} catch {}
	}

	const columns = table.createColumns([
		table.column({
			accessor: (s: Security) => h(s),
			id: 'h',
			header: 'H',
			cell: ({ value }) => {
				return numberFormatter.format(value);
			}
		}),
		table.column({
			accessor: 'symbol',
			header: 'Symbol'
		}),
		table.column({
			accessor: 'price',
			header: 'Price',
			cell: ({ value }) => {
				return currencyFormatter.format(value);
			}
		}),
		table.column({
			accessor: 'sector',
			header: 'Sector'
		}),
		table.column({
			accessor: (c) => (typeof c.dividendYield !== 'number' ? -1 : c.dividendYield),
			header: 'Yield (Annual)',
			cell: ({ value }) => {
				return typeof value !== 'number' ? 'N/A' : percentFormatter.format(value / 100);
			}
		}),
		table.column({
			accessor: (c) => (typeof c.peRatio !== 'number' ? null : c.peRatio),
			header: 'P/E',
			cell: ({ value }) => {
				return value === null ? 'N/A' : value.toFixed(2);
			}
		}),
		table.column({
			accessor: 'MarketCapAllClasses',
			header: 'Market Cap',
			cell: ({ value }) => {
				return value === 0 ? 'N/A' : currencyFormatter.format(value);
			}
		}),
		table.column({
			accessor: 'name',
			header: 'Name'
		}),
		table.column({
			accessor: (s) => s,
			header: '',
			cell: ({ value }) => {
				return createRender(DataTableActions, { security: value });
			}
		})
	]);

	let page = $state(1);

	const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates, flatColumns } =
		table.createViewModel(columns);

	const { hasNextPage, hasPreviousPage, pageIndex, pageSize, pageCount } = pluginStates.page;
	const { filterValue } = pluginStates.filter;
	const { hiddenColumnIds } = pluginStates.hide;

	const ids = flatColumns.map((col) => col.id);
	let hideForId = $state(Object.fromEntries(ids.map((id) => [id, true])));

	$effect(() => {
		$hiddenColumnIds = Object.entries(hideForId)
			.filter(([, hide]) => !hide)
			.map(([id]) => id);
	});

	$effect(() => {
		$pageIndex = page - 1;
	});

	const hidableCols = [
		'symbol',
		'price',
		'sector',
		'dividendYield',
		'peRatio',
		'MarketCapAllClasses',
		'name'
	];
</script>

<div class="p-4">
	<div class="flex items-center pb-4">
		<Input class="max-w-sm" placeholder="Filter content..." type="text" bind:value={$filterValue} />

		<div class="mx-auto">
			<Input
				class="mb-2"
				placeholder="s.dividendYield - Math.sqrt(s.peRatio)"
				type="text"
				bind:value={hString}
				onfocusout={onHeuristicChange}
			/>

			<div class="flex flex-wrap gap-1">
				{#each hidableCols as col}
					<Badge>{col}</Badge>
				{/each}
			</div>
		</div>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild let:builder>
				<Button variant="outline" class="ml-auto" builders={[builder]}>
					Page Size <ChevronDown class="ml-2 h-4 w-4" />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item on:click={() => ($pageSize = 10)}>10</DropdownMenu.Item>
				<DropdownMenu.Item on:click={() => ($pageSize = 25)}>25</DropdownMenu.Item>
				<DropdownMenu.Item on:click={() => ($pageSize = 50)}>50</DropdownMenu.Item>
				<DropdownMenu.Item on:click={() => ($pageSize = 100)}>100</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild let:builder>
				<Button variant="outline" class="ml-2" builders={[builder]}>
					Columns <ChevronDown class="ml-2 h-4 w-4" />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				{#each flatColumns as col}
					{#if hidableCols.includes(col.id)}
						<DropdownMenu.CheckboxItem bind:checked={hideForId[col.id]}>
							{col.header}
						</DropdownMenu.CheckboxItem>
					{/if}
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
	<div class="rounded-md border">
		<Table.Root {...$tableAttrs}>
			<Table.Header>
				{#each $headerRows as headerRow}
					<Subscribe rowAttrs={headerRow.attrs()}>
						<Table.Row>
							{#each headerRow.cells as cell (cell.id)}
								<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
									<Table.Head {...attrs}>
										<Button variant="ghost" on:click={props.sort.toggle}>
											<Render of={cell.render()} />
											<ArrowUpDown class={'ml-2 h-4 w-4'} />
											{props.sort.order}
										</Button>
									</Table.Head>
								</Subscribe>
							{/each}
						</Table.Row>
					</Subscribe>
				{/each}
			</Table.Header>
			<Table.Body {...$tableBodyAttrs}>
				{#each $pageRows as row (row.id)}
					<Subscribe rowAttrs={row.attrs()} let:rowAttrs>
						<Table.Row {...rowAttrs}>
							{#each row.cells as cell (cell.id)}
								<Subscribe attrs={cell.attrs()} let:attrs>
									<Table.Cell {...attrs} class="truncate">
										<Render of={cell.render()} />
									</Table.Cell>
								</Subscribe>
							{/each}
						</Table.Row>
					</Subscribe>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
	<div class="flex items-center justify-center space-x-4 py-4">
		<Pagination.Root
			count={$pageCount * $pageSize}
			bind:perPage={$pageSize}
			bind:page
			let:pages
			let:currentPage
		>
			<Pagination.Content>
				<Pagination.Item class={$hasPreviousPage ? '' : 'disabled'}>
					<Pagination.PrevButton />
				</Pagination.Item>
				{#each pages as page (page.key)}
					{#if page.type === 'ellipsis'}
						<Pagination.Item>
							<Pagination.Ellipsis />
						</Pagination.Item>
					{:else}
						<Pagination.Item>
							<Pagination.Link {page} isActive={currentPage == page.value}>
								{page.value}
							</Pagination.Link>
						</Pagination.Item>
					{/if}
				{/each}
				<Pagination.Item class={$hasNextPage ? '' : 'disabled'}>
					<Pagination.NextButton />
				</Pagination.Item>
			</Pagination.Content>
		</Pagination.Root>
	</div>
</div>
