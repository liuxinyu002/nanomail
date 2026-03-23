import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  type Relation
} from 'typeorm'
import { Email } from './Email.entity'
import { BoardColumn } from './BoardColumn.entity'

export type TodoStatus = 'pending' | 'in_progress' | 'completed'

/**
 * Todo source - tracks where the todo was created from
 * - email: extracted from email content
 * - chat: created by AI assistant
 * - manual: manually created by user
 */
export type TodoSource = 'email' | 'chat' | 'manual'

/**
 * Todo Entity
 *
 * Note: urgency field is deprecated - task status is now determined by boardColumnId
 * - boardColumnId: The column the todo belongs to (Inbox, Todo, In Progress, Done, etc.)
 * - position: Order within the column for drag-and-drop sorting
 * - emailId: Nullable to support standalone todos (e.g., created by AI assistant)
 * - source: Tracks where the todo originated from
 */
@Entity('todos')
export class Todo {
  @PrimaryGeneratedColumn('increment')
  id!: number

  /**
   * Email ID that this todo is associated with
   * Nullable to support standalone todos created by AI assistant
   */
  @Column({ type: 'integer', nullable: true })
  emailId!: number | null

  @ManyToOne(() => Email, (email) => email.todos)
  email!: Relation<Email> | null

  @Column({ type: 'text' })
  description!: string

  @Column({
    type: 'text',
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  })
  status!: TodoStatus

  /**
   * Deadline for the todo item
   * Stored as UTC datetime (with Z suffix) to ensure timezone consistency
   * Set from LLM-extracted deadline in YYYY-MM-DD format, converted to end of day UTC
   */
  @Column({ type: 'datetime', nullable: true })
  deadline!: Date | null

  /**
   * The board column this todo belongs to
   * NOT nullable - all todos must belong to a column
   * Default: 1 (Inbox)
   */
  @Column({ type: 'integer', default: 1 })
  boardColumnId!: number

  @ManyToOne(() => BoardColumn, (column) => column.todos)
  boardColumn!: Relation<BoardColumn>

  /**
   * Position within the column for ordering
   * Used for drag-and-drop sorting within a column
   */
  @Column({ type: 'integer', default: 0 })
  position!: number

  /**
   * Optional notes for the todo item
   * Max 2000 characters, can be null
   */
  @Column({ type: 'text', nullable: true })
  notes!: string | null

  /**
   * Source tracking - where the todo was created from
   * - email: extracted from email content
   * - chat: created by AI assistant during conversation
   * - manual: manually created by user
   */
  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source!: TodoSource

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date
}
